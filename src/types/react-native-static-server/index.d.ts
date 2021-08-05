declare module 'react-native-static-server' {
  export default class StaticServer {
    constructor(port: number, path?: string, { localOnly: boolean });
    start: () => Promise<string>;
    stop: () => void;
    isRunning: () => Promise<boolean>;
    origin: string;
  }
}
