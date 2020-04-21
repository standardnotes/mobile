declare module '@tectiv3/react-native-aes-crypto' {
    function pbkdf2(password: string, salt: string, cost: number, length: number): Promise<string>;
    function encrypt(text: string, key: string, iv: string): Promise<string>;
    function decrypt(ciphertext: string, key: string, iv: string): Promise<string>;
    function hmac256(ciphertext: string, key: string): Promise<string>;
    function randomKey(length: number): Promise<string>;
    function sha1(text: string): Promise<string>;
    function sha256(text: string): Promise<string>;
    function sha512(text: string): Promise<string>;
}
