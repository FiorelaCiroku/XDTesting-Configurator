export interface Ontology {
  name: string;
  url?: string;
  userDefined?: boolean;
  parsed?: boolean;
  ignored?: boolean;
}

export interface OntologyForm {
  name: string;
  url: string;
  file: FileList;
}
