declare const fileSystemPathBrand: unique symbol;

export type FileSystemPath = string & { readonly [fileSystemPathBrand]: "FileSystemPath" };

export function toFileSystemPath(value: string): FileSystemPath {
  const normalizedPath = value.trim();

  if (!normalizedPath) {
    throw new Error("FlowDesk expected a file system path.");
  }

  return normalizedPath as FileSystemPath;
}
