export type FileTypes = 'query' | 'expectedResults' | 'dataset';
export type FileTypeSpecs = {
  [k in FileTypes]: FileTypeSpec;
};

interface FileTypeSpec {
  folder: string;
  label: string;
}
