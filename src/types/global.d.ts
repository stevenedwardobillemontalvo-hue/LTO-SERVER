declare global {
  namespace NodeJS {
    interface Global {
      __basedir: string;
    }
  }
  var __basedir: string;
}

declare module "@models/*";
declare module "@routes/*";
declare module "@helpers/*";
declare module "@config/*";


export {};
