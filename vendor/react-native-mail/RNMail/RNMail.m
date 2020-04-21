#import <MessageUI/MessageUI.h>
#import "RNMail.h"
#import <React/RCTConvert.h>
#import <React/RCTLog.h>

@implementation RNMail
{
    NSMutableDictionary *_callbacks;
}

- (instancetype)init
{
    if ((self = [super init])) {
        _callbacks = [[NSMutableDictionary alloc] init];
    }
    return self;
}

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (dispatch_queue_t)methodQueue
{
    return dispatch_get_main_queue();
}

RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(mail:(NSDictionary *)options
                  callback: (RCTResponseSenderBlock)callback)
{
    if ([MFMailComposeViewController canSendMail])
    {
        MFMailComposeViewController *mail = [[MFMailComposeViewController alloc] init];
        mail.mailComposeDelegate = self;
        _callbacks[RCTKeyForInstance(mail)] = callback;

        if (options[@"subject"]){
            NSString *subject = [RCTConvert NSString:options[@"subject"]];
            [mail setSubject:subject];
        }

        BOOL isHTML = NO;

        if (options[@"isHTML"]){
            isHTML = [options[@"isHTML"] boolValue];
        }

        if (options[@"body"]){
            NSString *body = [RCTConvert NSString:options[@"body"]];
            [mail setMessageBody:body isHTML:isHTML];
        }

        if (options[@"recipients"]){
            NSArray *recipients = [RCTConvert NSArray:options[@"recipients"]];
            [mail setToRecipients:recipients];
        }

        if (options[@"ccRecipients"]){
            NSArray *ccRecipients = [RCTConvert NSArray:options[@"ccRecipients"]];
            [mail setCcRecipients:ccRecipients];
        }

        if (options[@"bccRecipients"]){
            NSArray *bccRecipients = [RCTConvert NSArray:options[@"bccRecipients"]];
            [mail setBccRecipients:bccRecipients];
        }

        if (options[@"attachment"] && (options[@"attachment"][@"path"] || options[@"attachment"][@"data"]) && options[@"attachment"][@"type"]){

            NSString *attachmentType = [RCTConvert NSString:options[@"attachment"][@"type"]];
            NSString *attachmentName = [RCTConvert NSString:options[@"attachment"][@"name"]];

            NSString *base64String, *jsonString, *attachmentPath;
            if(options[@"attachment"][@"data"]) {
                if([attachmentType isEqualToString:@"json"]) {
                    jsonString = [RCTConvert NSString:options[@"attachment"][@"data"]];
                } else {
                    base64String = [RCTConvert NSString:options[@"attachment"][@"data"]];
                }
            } else {
                attachmentPath = [RCTConvert NSString:options[@"attachment"][@"path"]];
            }

            // Set default filename if not specificed
            if (!attachmentName) {
                attachmentName = [[attachmentPath lastPathComponent] stringByDeletingPathExtension];
            }

            NSData *fileData;
            if(base64String) {
                fileData = [[NSData alloc] initWithBase64EncodedString:base64String options:NSDataBase64DecodingIgnoreUnknownCharacters];
            } else if(jsonString) {
                // JavaScript JSON uses UTF-16
                fileData = [jsonString dataUsingEncoding:NSUTF16StringEncoding];
            } else {
                // Get the resource path and read the file using NSData
                fileData = [NSData dataWithContentsOfFile:attachmentPath];
            }


            // Determine the MIME type
            NSString *mimeType;

            /*
             * Add additional mime types and PR if necessary. Find the list
             * of supported formats at http://www.iana.org/assignments/media-types/media-types.xhtml
             */
            if ([attachmentType isEqualToString:@"jpg"]) {
                mimeType = @"image/jpeg";
            } else if ([attachmentType isEqualToString:@"png"]) {
                mimeType = @"image/png";
            } else if ([attachmentType isEqualToString:@"doc"]) {
                mimeType = @"application/msword";
            } else if ([attachmentType isEqualToString:@"ppt"]) {
                mimeType = @"application/vnd.ms-powerpoint";
            } else if ([attachmentType isEqualToString:@"html"]) {
                mimeType = @"text/html";
            } else if ([attachmentType isEqualToString:@"csv"]) {
                mimeType = @"text/csv";
            } else if ([attachmentType isEqualToString:@"pdf"]) {
                mimeType = @"application/pdf";
            } else if ([attachmentType isEqualToString:@"vcard"]) {
                mimeType = @"text/vcard";
            } else if ([attachmentType isEqualToString:@"json"]) {
                mimeType = @"application/json";
            } else if ([attachmentType isEqualToString:@"zip"]) {
                mimeType = @"application/zip";
            } else if ([attachmentType isEqualToString:@"text"]) {
                mimeType = @"text/*";
            }

            attachmentName = [NSString stringWithFormat:@"%@.%@", attachmentName, attachmentType];

            // Add attachment
            [mail addAttachmentData:fileData mimeType:mimeType fileName:attachmentName];
        }

        UIViewController *root = [[[[UIApplication sharedApplication] delegate] window] rootViewController];

        while (root.presentedViewController) {
            root = root.presentedViewController;
        }
        [root presentViewController:mail animated:YES completion:nil];
    } else {
        callback(@[@"not_available"]);
    }
}

#pragma mark MFMailComposeViewControllerDelegate Methods

- (void)mailComposeController:(MFMailComposeViewController *)controller didFinishWithResult:(MFMailComposeResult)result error:(NSError *)error
{
    NSString *key = RCTKeyForInstance(controller);
    RCTResponseSenderBlock callback = _callbacks[key];
    if (callback) {
        switch (result) {
            case MFMailComposeResultSent:
                callback(@[[NSNull null] , @"sent"]);
                break;
            case MFMailComposeResultSaved:
                callback(@[[NSNull null] , @"saved"]);
                break;
            case MFMailComposeResultCancelled:
                callback(@[[NSNull null] , @"cancelled"]);
                break;
            case MFMailComposeResultFailed:
                callback(@[@"failed"]);
                break;
            default:
                callback(@[@"error"]);
                break;
        }
        [_callbacks removeObjectForKey:key];
    } else {
        RCTLogWarn(@"No callback registered for mail: %@", controller.title);
    }
    UIViewController *ctrl = [[[[UIApplication sharedApplication] delegate] window] rootViewController];
    while (ctrl.presentedViewController && ctrl != controller) {
        ctrl = ctrl.presentedViewController;
    }
    [ctrl dismissViewControllerAnimated:YES completion:nil];
}

#pragma mark Private

static NSString *RCTKeyForInstance(id instance)
{
    return [NSString stringWithFormat:@"%p", instance];
}

@end
