export class WorkspaceDiagnostic {
  constructor(context) { this.context = context; }
  async checkWorkspaceHealth() { return []; }
  enforceBoundaries(filePath, imports) { return []; }
}
