export class WorkspaceGraph {
  constructor(context) { 
    this.context = context; 
    this.packageManifests = new Map();
  }
  async initializeWorkspaceMesh() {}
  markWorkspacePackagesAsUsed() {}
}
