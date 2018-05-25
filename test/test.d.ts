declare module NodeJS  {
    interface Global {
        onWindowsIt: (expectation: string, test: () => void) => void;
    }
}