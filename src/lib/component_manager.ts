import {
  FeatureDescription,
  FeatureIdentifier,
  Features,
} from '@standardnotes/features';
import {
  ComponentMutator,
  isRightVersionGreaterThanLeft,
  PermissionDialog,
  SNAlertService,
  SNApplication,
  SNComponent,
  SNComponentManager,
  SNLog,
  SNNote,
  SNProtocolService,
} from '@standardnotes/snjs';
import { objectToCss } from '@Style/css_parser';
import { MobileTheme } from '@Style/theme_service';
import { Base64 } from 'js-base64';
import RNFS, { DocumentDirectoryPath } from 'react-native-fs';
import StaticServer from 'react-native-static-server';
import { unzip } from 'react-native-zip-archive';

const FeatureChecksums = require('@standardnotes/features/dist/static/checksums.json');

const STATIC_SERVER_PORT = 8080;
const BASE_DOCUMENTS_PATH = DocumentDirectoryPath;
const EDITORS_PATH = '/editors';

export class ComponentManager extends SNComponentManager {
  private mobileActiveTheme?: MobileTheme;

  private staticServer!: StaticServer;
  private staticServerUrl!: string;
  private protocolService!: SNProtocolService;
  private thirdPartyIndexPaths: Record<string, string> = {};

  public async initialize(protocolService: SNProtocolService) {
    this.protocolService = protocolService;
    this.loggingEnabled = true;
    await this.createServer();
  }

  private async createServer() {
    const path = `${BASE_DOCUMENTS_PATH}${EDITORS_PATH}`;
    let server: StaticServer;

    server = new StaticServer(STATIC_SERVER_PORT, path, {
      localOnly: true,
    });
    try {
      const serverUrl = await server.start();
      this.staticServer = server;
      this.staticServerUrl = serverUrl;
    } catch (e: unknown) {
      SNLog.error(e as any);
    }
  }

  deinit() {
    super.deinit();
    this.staticServer!.stop();
  }

  public isEditorDownloadable(component: SNComponent): boolean {
    const identifier = component.identifier;
    const nativeFeature = this.nativeFeatureForIdentifier(identifier);
    const downloadUrl =
      nativeFeature?.download_url || component.package_info?.download_url;
    return !!downloadUrl;
  }

  public async doesEditorNeedDownload(
    component: SNComponent
  ): Promise<boolean> {
    const identifier = component.identifier;
    const nativeFeature = this.nativeFeatureForIdentifier(identifier);
    const downloadUrl =
      nativeFeature?.download_url || component.package_info?.download_url;

    if (!downloadUrl) {
      throw Error('Attempting to download editor with no download url');
    }

    const version = nativeFeature?.version || component.package_info?.version;

    const existingPackageJson = await this.getDownloadedEditorPackageJsonFile(
      identifier
    );
    const existingVersion = existingPackageJson?.version;
    this.log('Existing package version', existingVersion);
    this.log('Latest package version', version);

    const shouldDownload =
      !existingPackageJson ||
      isRightVersionGreaterThanLeft(existingVersion, version);

    return shouldDownload;
  }

  public async downloadEditorOffline(
    component: SNComponent
  ): Promise<{ error?: boolean }> {
    const identifier = component.identifier;
    const nativeFeature = this.nativeFeatureForIdentifier(identifier);
    const downloadUrl =
      nativeFeature?.download_url || component.package_info?.download_url;

    if (!downloadUrl) {
      throw Error('Attempting to download editor with no download url');
    }

    try {
      await this.performDownloadEditor(identifier, downloadUrl);
    } catch (e: unknown) {
      console.error(e);
      return { error: true };
    }

    const editorPath = this.pathForEditor(identifier);
    if (!(await RNFS.exists(editorPath))) {
      this.log(
        `No editor exists at path ${editorPath}, not using offline editor`
      );
      return { error: true };
    }

    return {};
  }

  public nativeFeatureForIdentifier(identifier: FeatureIdentifier) {
    return Features.find(
      (feature: FeatureDescription) => feature.identifier === identifier
    );
  }

  public isComponentThirdParty(component: SNComponent): boolean {
    return !this.nativeFeatureForIdentifier(component.identifier);
  }

  public async preloadThirdPartyIndexPath(component: SNComponent) {
    const packageJson = await this.getDownloadedEditorPackageJsonFile(
      component.identifier
    );
    this.thirdPartyIndexPaths[component.identifier] =
      packageJson?.sn?.main || 'index.html';
  }

  private async passesChecksumValidation(
    filePath: string,
    featureIdentifier: FeatureIdentifier
  ) {
    this.log('Performing checksum verification on', filePath);
    const zipContents = await RNFS.readFile(filePath, 'base64');
    const checksum = await this.protocolService.crypto.sha256(zipContents);

    const desiredChecksum = FeatureChecksums[featureIdentifier]?.base64;
    if (!desiredChecksum) {
      this.log(
        `Checksum is missing for ${featureIdentifier}; aborting installation`
      );
      return false;
    }
    if (checksum !== desiredChecksum) {
      this.log(
        `Checksums don't match for ${featureIdentifier}; ${checksum} != ${desiredChecksum}; aborting install`
      );
      return false;
    }
    this.log(
      `Checksum ${checksum} matches ${desiredChecksum} for ${featureIdentifier}`
    );

    return true;
  }

  private async performDownloadEditor(
    identifier: FeatureIdentifier,
    downloadUrl: string
  ) {
    const tmpLocation = `${BASE_DOCUMENTS_PATH}/${identifier}.zip`;

    if (await RNFS.exists(tmpLocation)) {
      this.log('Deleting file at', tmpLocation);
      await RNFS.unlink(tmpLocation);
    }

    this.log(
      'Downloading editor',
      identifier,
      'from url',
      downloadUrl,
      'to location',
      tmpLocation
    );
    await RNFS.downloadFile({
      fromUrl: downloadUrl,
      toFile: tmpLocation,
    }).promise;
    this.log('Finished download to tmp location', tmpLocation);

    const requireChecksumVerification = !!this.nativeFeatureForIdentifier(
      identifier
    );
    if (requireChecksumVerification) {
      const passes = await this.passesChecksumValidation(
        tmpLocation,
        identifier
      );
      if (!passes) {
        return false;
      }
    }

    const editorPath = this.pathForEditor(identifier);
    this.log(`Attempting to unzip ${tmpLocation} to ${editorPath}`);
    await unzip(tmpLocation, editorPath);
    this.log('Unzipped editor to', editorPath);
    await RNFS.unlink(tmpLocation);
    return true;
  }

  private pathForEditor(identifier: FeatureIdentifier) {
    return `${BASE_DOCUMENTS_PATH}${EDITORS_PATH}/${identifier}`;
  }

  private async getDownloadedEditorPackageJsonFile(
    identifier: FeatureIdentifier
  ): Promise<Record<string, any> | undefined> {
    const editorPath = this.pathForEditor(identifier);
    if (!(await RNFS.exists(editorPath))) {
      return undefined;
    }
    const filePath = `${editorPath}/package.json`;
    if (!(await RNFS.exists(filePath))) {
      return undefined;
    }
    const fileContents = await RNFS.readFile(filePath);
    if (!fileContents) {
      return undefined;
    }
    const packageJson = JSON.parse(fileContents);
    return packageJson;
  }

  async presentPermissionsDialog(dialog: PermissionDialog) {
    const text = `${dialog.component.name} would like to interact with your ${dialog.permissionsString}`;
    const approved = await (this.alertService! as SNAlertService).confirm(
      text,
      'Grant Permissions',
      'Continue',
      undefined,
      'Cancel'
    );
    dialog.callback(approved);
  }

  /** @override */
  urlForComponent(component: SNComponent) {
    if (component.isTheme() && component.safeContent.isSystemTheme) {
      const theme = component as MobileTheme;
      const cssData = objectToCss(theme.mobileContent.variables);
      const encoded = Base64.encodeURI(cssData);
      return `data:text/css;base64,${encoded}`;
    }

    const identifier = component.identifier;
    const nativeFeature = this.nativeFeatureForIdentifier(identifier);
    const downloadUrl =
      nativeFeature?.download_url || component.package_info?.download_url;

    if (!downloadUrl) {
      return super.urlForComponent(component);
    }

    const editorPath = this.pathForEditor(identifier);
    let mainFileName;

    if (nativeFeature) {
      mainFileName = nativeFeature.index_path;
    } else {
      mainFileName = this.thirdPartyIndexPaths[identifier];
      if (!mainFileName) {
        throw Error('Third party index path was not preloaded');
      }
    }

    const splitPackagePath = editorPath.split(EDITORS_PATH);
    const relativePackagePath = splitPackagePath[splitPackagePath.length - 1];
    const relativeMainFilePath = `${relativePackagePath}/${mainFileName}`;
    return `${this.staticServerUrl}${relativeMainFilePath}`;
  }

  public setMobileActiveTheme(theme: MobileTheme) {
    this.mobileActiveTheme = theme;
    this.postActiveThemesToAllViewers();
  }

  /** @override */
  getActiveThemes() {
    if (this.mobileActiveTheme) {
      return [this.mobileActiveTheme];
    } else {
      return [];
    }
  }
}

export async function associateComponentWithNote(
  application: SNApplication,
  component: SNComponent,
  note: SNNote
) {
  return application.changeItem<ComponentMutator>(component.uuid, mutator => {
    mutator.removeDisassociatedItemId(note.uuid);
    mutator.associateWithItem(note.uuid);
  });
}
