declare module 'react-test-renderer' {
  export function create(element: any): any;
  export function act(callback: () => void | Promise<void>): void | Promise<void>;
  const defaultExport: {
    create: typeof create;
    act: typeof act;
  };
  export default defaultExport;
}
