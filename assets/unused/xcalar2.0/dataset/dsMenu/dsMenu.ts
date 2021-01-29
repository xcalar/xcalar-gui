/*
 * Module for management of dsObj
 */
namespace DS {
  let homeDirId: string; // DSObjTerm.homeDirId

  let curDirId: string;       // current folder id
  let dsLookUpTable: {[key: string]: DSObj} = {};  // find DSObj by dsId
  let homeFolder;
  let dsInfoMeta: SharedDSInfo;
  let errorDSSet = {}; // UI cache only

  let $gridView: JQuery;      // $("#dsListSection .gridItems")
  let $gridMenu: JQuery;      // $("#gridViewMenu")

  let dirStack: string[] = []; // for go back and forward
  let $backFolderBtn: JQuery;    //$("#backFolderBtn");
  let $forwardFolderBtn: JQuery; // $("#forwardFolderBtn")
  let $dsListFocusTrakcer: JQuery; // $("#dsListFocusTrakcer");
  let sortKey: string = null;
  let disableShare: boolean = false;
  // for DS drag n drop
  let $dragDS: JQuery;
  let $dropTarget: JQuery;

  /**
   * DS.setup
   */
  export function setup(): void {
      homeDirId = DSObjTerm.homeDirId;
      $gridView = $("#dsListSection .gridItems");
      $gridMenu = $("#gridViewMenu");

      $backFolderBtn = $("#backFolderBtn");
      $forwardFolderBtn = $("#forwardFolderBtn");
      $dsListFocusTrakcer = $("#dsListFocusTrakcer");

      setupGridViewButtons();
      setupGrids();
      setupGridMenu();
  }

  /**
   * DS.updateNumDS
   * @param numDatasets
   */
  export function updateNumDS(numDatasets?: number): void {
      let $numDataStores = $(".numDataStores:not(.tutor)");
      if (numDatasets != null) {
          $numDataStores.text(numDatasets);
      } else {
          let numDS = $("#dsListSection .gridItems .ds").length;
          $numDataStores.text(numDS);
      }
  }

  /**
   * DS.restore
   * Restore dsObj
   * @param oldHomeFolder
   * @param atStartUp
   */
  export function restore(
      oldHomeFolder: DSDurable,
      atStartUp: boolean
  ): XDPromise<void> {
      // data mart doesn't restore
      return PromiseHelper.resolve();

      return restoreDS(oldHomeFolder, atStartUp);
  }

  /**
   * DS.restoreSourceFromDagNode
   * @param dagNodes
   * @param share
   */
  export function restoreSourceFromDagNode(
      dagNodes: DagNodeDataset[],
      share: boolean
  ) {
      const deferred = PromiseHelper.deferred();
      const failures = [];
      const nameToDagMap = new Map();
      const promises = [];

      dagNodes.forEach((dagNode) => {
          if (!(dagNode instanceof DagNodeDataset)) {
              return;
          }
          const dsName = dagNode.getDSName(true);
          if (DS.getDSObj(dsName) != null) {
              return;
          }
          const loadArgs = dagNode.getLoadArgs();
          if (!loadArgs) {
              failures.push({"error": "Invalid load args"});
              return;
          }
          const key = dsName + ".Xcalar." + loadArgs; // a unique key
          if (!nameToDagMap.has(key)) {
              nameToDagMap.set(key, []);
          }
          const nodeArray = nameToDagMap.get(key);
          nodeArray.push(dagNode);
      });

      nameToDagMap.forEach((dagNodes) => {
          let promise = restoreSourceFromDagNodeHelper(dagNodes, share, failures);
          promises.push(promise);
      });

      PromiseHelper.when(...promises)
      .then(() => {
          if (failures.length) {
              // XXX TODO: make it a helper function
              const errMsg = failures.map((error) => {
                  if (typeof error === "string") {
                      return error;
                  } else if (typeof error === "object" && error.error) {
                      return error.error;
                  } else {
                      return JSON.stringify(error);
                  }
              });
              Alert.error(ErrTStr.RestoreDS, errMsg.join("\n"));
              deferred.reject(errMsg);
          }
          deferred.resolve();
      })
      .fail(deferred.reject);

      return deferred.promise();
  }

  function loadArgsAdapter(loadArgsStr: string): string | null {
      try {
          if (loadArgsStr == null) {
              return null;
          }

          if (typeof loadArgsStr !== "string") {
              // we don't support any invalid loadArgsStr
              return null;
          }

          let parsed = JSON.parse(loadArgsStr);
          if (parsed.sourceArgsList != null) {
              // a old kind of format. to be deprecated
              loadArgsStr = JSON.stringify({
                  operation: XcalarApisTStr[XcalarApisT.XcalarApiBulkLoad],
                  args: {
                      loadArgs: parsed
                  }
              });
          }
          return loadArgsStr;
      } catch (e) {
          console.error(e);
          return null;
      }
  }

  // restore a set of dataset who share the same dsName and loadArgs
  function restoreSourceFromDagNodeHelper(
      dagNodes: DagNodeDataset[],
      share: boolean,
      failures: string[]
  ): XDPromise<void> {
      let deferred: XDDeferred<void> = PromiseHelper.deferred();
      let oldDSName = dagNodes[0].getDSName(true);
      let newDSName = getNewDSName(oldDSName);
      let loadArgs: string = dagNodes[0].getLoadArgs();
      loadArgs = loadArgsAdapter(loadArgs);
      if (loadArgs == null) {
          return PromiseHelper.reject({"error": "Invalid load args"});
      }

      const cachedInfo = {};
      dagNodes.forEach((dagNode) => {
          let param = xcHelper.deepCopy(dagNode.getParam());
          let error = dagNode.getError();
          param.source = newDSName;
          param.loadArgs = loadArgs.replace(oldDSName, newDSName);
          dagNode.setParam(param, true);
          cachedInfo[dagNode.getId()] = {
              param: param,
              error: error
          };
      });
      // replace parameters
      loadArgs = DagNodeInput.replaceParameters(
          loadArgs,
          DagParamManager.Instance.getParamMap()
      );
      restoreDatasetHelper(newDSName, loadArgs)
      .then((dsObj) => {
          if (share) {
              let dsId = dsObj.getId();
              let newName = getSharedName(dsId, dsObj.getName());
              let innerDeferred = PromiseHelper.deferred();
              shareAndUnshareHelper(dsId, newName, true)
              .then(() => {
                  innerDeferred.resolve();
              })
              .fail((error) => {
                  failures.push(error);
                  innerDeferred.resolve(); // still resolve
              });
              return innerDeferred.promise();
          }
      })
      .then(() => {
          deferred.resolve();
      })
      .fail((error) => {
          dagNodes.forEach((dagNode) => {
              const info = cachedInfo[dagNode.getId()] || {};
              if (dagNode.getState() === DagNodeState.Configured &&
                  JSON.stringify(dagNode.getParam()) === JSON.stringify(info.param)
              ) {
                  // when still in configure state and param has not changed
                  dagNode.beErrorState(info.error);
              }
          });

          failures.push(error);
          deferred.resolve(); // still reolsve it
      });

      return deferred.promise();
  }

  function restoreDatasetHelper(
      fullDSName: string,
      loadArgsStr: string
  ): XDPromise<DSObj>  {
      if (DS.getDSObj(fullDSName) != null) {
          return PromiseHelper.reject({
              error: "Dataset already exists"
          });
      }
      let deferred: XDDeferred<DSObj> = PromiseHelper.deferred();
      try {
          let loadArgs = JSON.parse(loadArgsStr).args.loadArgs;
          loadArgs = normalizeLoadArgs(loadArgs);
          let parsedName = xcHelper.parseDSName(fullDSName);
          let dsArgs = {
              name: parsedName.dsName,
              user: parsedName.user,
              fullName: fullDSName,
              sources: loadArgs.sourceArgsList
          };
          return DS.load(dsArgs, {
              restoreArgs: loadArgs
          });
      } catch (e) {
          console.error(e);
          deferred.reject({
              error: e.message
          });
      }

      return deferred.promise();
  }

  function normalizeLoadArgs(loadArgs: any): any {
      try {
          let udfPath: string = loadArgs.parseArgs.parserFnName;
          if (udfPath &&
              udfPath.length > 0 &&
              !udfPath.startsWith("default") &&
              !udfPath.includes("/")
          ) {
              // when it's a relative path
              udfPath = UDFFileManager.Instance.getCurrWorkbookPath() + udfPath;
              let udfModule = udfPath.split(":")[0];
              if (UDFFileManager.Instance.getUDFs().has(udfModule)) {
                  // when has the UDF, use the absolute path
                  loadArgs.parseArgs.parserFnName = udfPath;
              }
          }
      } catch (e) {
          console.error(e);
      }

      return loadArgs;
  }

  function getNewDSName(oldDSName: string): string {
      let parsedName = xcHelper.parseDSName(oldDSName);
      let dsName = DS.getUniqueName(parsedName.dsName);
      return xcHelper.wrapDSName(dsName, <string>parsedName.randId);
  }

  /**
   * DS.isAccessible
   */
  export function isAccessible(dsName: string): boolean {
      let parsedRes = xcHelper.parseDSName(dsName);
      if (parsedRes.user === XcUser.getCurrentUserName()) {
          return true;
      }
      // if not the user, the dataset need to be shared
      let dsObj = DS.getDSObj(dsName);
      if (dsObj == null) {
          return false;
      }
      return isInSharedFolder(dsObj.getId());
  }

  /**
   * DS.isSharingDisabled
   */
  export function isSharingDisabled(): boolean {
      return disableShare;
  }

  /**
   * DS.toggleSharing
   * @param disable
   */
  export function toggleSharing(disable: boolean): void {
      disableShare = disable || false;
      let isSingleUser = XVM.isSingleUser();
      if (isSingleUser) {
          disableShare = true;
      }
      if (disableShare) {
          $gridView.addClass("disableShare");
          if (isSingleUser) {
              $gridMenu.find(".share, .unshare").addClass("xc-hidden");
          } else {
              $gridMenu.find(".share, .unshare").removeClass("xc-hidden");
              xcTooltip.add($gridMenu.find(".share"), {
                  title: DSTStr.DisableShare
              });
          }
      } else {
          $gridView.removeClass("disableShare");
      }
  }

  /**
   * Get home folder
   * DS.getHomeDir
   */
  export function getHomeDir(toPersist: boolean): DSDurable {
      // XXX disabled in data mart
      return homeFolder;

      if (toPersist) {
          let copy = removeNonpersistDSObjAttributes(homeFolder);
          for (var i = 0, len = copy.eles.length; i < len; i++) {
              if (copy.eles[i].id === DSObjTerm.SharedFolderId) {
                  copy.totalChildren -= copy.eles[i].totalChildren;
                  copy.eles.splice(i, 1);
                  break;
              }
          }
          return copy;
      } else {
          return homeFolder;
      }
  }

  /**
   * DS.getSharedDir
   * @param toPersist
   */
  export function getSharedDir(toPersist: boolean): DSDurable | DSObj {
      var sharedFolder = DS.getDSObj(DSObjTerm.SharedFolderId);
      if (toPersist) {
          return removeNonpersistDSObjAttributes(sharedFolder);
      } else {
          return sharedFolder;
      }
  }

  /**
   * DS.getLoadArgsFromDS
   * @param dsName
   */
  export function getLoadArgsFromDS(dsName: string): XDPromise<string> {
      let dsObj = DS.getDSObj(dsName);
      if (dsObj == null) {
          return PromiseHelper.reject();
      }

      if (dsObj.cachedLoadArgs) {
          return PromiseHelper.resolve(dsObj.cachedLoadArgs);
      }

      let deferred: XDDeferred<string> = PromiseHelper.deferred();
      let datasetName = dsObj.getFullName();
      XcalarDatasetGetLoadArgs(datasetName)
      .then((loadArgs) => {
          dsObj.cachedLoadArgs = loadArgs;
          deferred.resolve(loadArgs);
      })
      .fail(deferred.reject);

      return deferred.promise();
  }

  /**
   * DS.getFormatFromDS
   * @param dsObj
   */
  export function getFormatFromDS(dsObj: DSObj): XDPromise<string> {
      let deferred: XDDeferred<string> = PromiseHelper.deferred();
      DS.getLoadArgsFromDS(dsObj.getFullName())
      .then((res) => {
          try {
              let loadArgs = JSON.parse(res);
              let parserFnName = loadArgs.args.loadArgs.parseArgs.parserFnName;
              let format = DSConfig.getFormatFromParserFnName(parserFnName);
              dsObj.setFormat(format);
              commitDSChange();
              deferred.resolve(format);
          } catch (e) {
              console.error(e);
              deferred.reject(e.message);
          }
      })
      .fail(deferred.reject);

      return deferred.promise();
  }

  function removeNonpersistDSObjAttributes(folder: DSObj): DSDurable {
      let folderCopy = xcHelper.deepCopy(folder);
      let cache = [folderCopy];
      // restore the ds and folder
      while (cache.length > 0) {
          let obj = cache.shift();
          if (obj == null) {
              console.error("error case");
              continue;
          } else if (obj.isFolder) {
              if (obj.eles != null) {
                  $.merge(cache, obj.eles);
              }
          } else {
              // remove non-persisted attr in dsObj
              delete obj.activated;
              delete obj.columns;
          }
      }
      return folderCopy;
  }

  /**
   * Get dsObj by dsId
   * DS.getDSObj
   * @param dsId
   */
  export function getDSObj(dsId: string): DSObj | null {
      if (dsId == null) {
          return null;
      }
      return dsLookUpTable[dsId] || null;
  }

  /**
   * DS.getErrorDSObj
   * @param dsId
   */
  export function getErrorDSObj(dsId: string): DSObj | null {
      return errorDSSet[dsId] || null;
  }

  /**
   * DS.removeErrorDSObj
   * @param dsId
   */
  export function removeErrorDSObj(dsId: string): void {
      delete errorDSSet[dsId];
  }

  /**
   * Get grid element(folder/datasets) by dsId
   * DS.getGrid
   * @param dsId
   */
  export function getGrid(dsId: string): JQuery | null {
      if (dsId == null) {
          return null;
      } else if (dsId === homeDirId) {
          return $gridView;
      } else {
          return $gridView.find('.grid-unit[data-dsid="' + dsId + '"]');
      }
  }

  /** Tells us if a dataset by ID is loading
   * DS.isLoading
   * @param dsId
   */
  export function isLoading(dsId: string): boolean {
      if (dsId == null) {
          return null;
      } else {
          return $gridView.find('.grid-unit[data-dsid="' + dsId + '"]').hasClass("loading");
      }
  }

  /**
   * create a new folder
   * DS.newFolder
   */
  export function newFolder(): DSObj {
      let ds = createDS({
          "name": DSTStr.NewFolder,
          "isFolder": true
      });
      changeDSInfo(curDirId, {
          action: "add",
          ds: ds
      });

      // forcus on folder's label for renaming
      DS.getGrid(ds.id).click()
              .find('.label').click();

      return ds;
  }

  /**
   * DS.addCurrentUserDS
   */
  export function addCurrentUserDS(
      fullDSName: string,
      options: any
  ): DSObj | null {
      let parsedRes = xcHelper.parseDSName(fullDSName);
      let user = parsedRes.user;
      let dsName = parsedRes.dsName;
      options = $.extend({}, options, {
          "id": fullDSName, // user the fulldsname as a unique id
          "name": dsName,
          "user": user,
          "fullName": fullDSName,
          "isFolder": false
      });

      return createDS(options);
  }

  /**
   * DS.unFocus
   */
  export function unFocus(): void {
      $gridView.find(".grid-unit.active").removeClass("active");
  }

  /**
   * DS.focusOn
   * @param $grid
   */
  export function focusOn($grid: JQuery): XDPromise<boolean> {
      if ($grid == null && $grid.length === 0) {
          return;
      }
      if ($grid.hasClass("active") && $grid.hasClass("fetching")) {
          console.info("ds is fetching");
          return PromiseHelper.resolve();
      }

      let deferred: XDDeferred<boolean> = PromiseHelper.deferred();
      let dsId: string = $grid.data("dsid");

      $gridView.find(".active").removeClass("active");
      $grid.addClass("active");
      $dsListFocusTrakcer.data("dsid", dsId).focus();
      var isLoading = $grid.hasClass('loading');
      // folder do not show anything
      if ($grid.hasClass("folder")) {
          return PromiseHelper.resolve();
      } else if ($grid.hasClass("unlistable")) {
          return PromiseHelper.resolve();
      } else if ($grid.hasClass("inActivated") && !isLoading) {
          let dsObj = DS.getDSObj(dsId);
          let error = ErrTStr.InactivateDS;
          if (dsObj) {
              error = dsObj.getError() || error;
          }
          return PromiseHelper.resolve();
      }

      if (!isLoading) {
          $grid.removeClass("notSeen");
      }
      deferred.resolve(isLoading);

      return deferred.promise();
  }

 /**
  * Import dataset, promise returns dsObj
  * DS.load
  */
  export function load(
      dsArgs: any,
      options: {
          dsToReplace?: string,
          restoreArgs?: object
      }
  ): XDPromise<DSObj> {
      options = options || {};
      let dsToReplace: string = options.dsToReplace || null;
      // Here null means the attr is a placeholder, will
      // be update when the sample table is loaded
      if (isInSharedFolder(curDirId)) {
          // if in the uneditable folder, go to the home folder first
          DS.goToDir(homeDirId);
          clearDirStack();
      }
      dsArgs.date = new Date().getTime();
      if (options.restoreArgs != null) {
          // restore from loadArgs case
          curDirId = homeDirId;
          dsArgs.parentId = curDirId;
      }
      let dsObj = createDS(dsArgs, dsToReplace);
      let sql = {
          "operation": SQLOps.DSImport,
          "args": dsArgs,
          "options": options
      };

      sortDS(curDirId);
      return importHelper(dsObj, sql, options.restoreArgs);
  }

  /**
   * DS.getSchema
   */
  export function getSchema(source: string): {
      schema: ColSchema[],
      error?: string
  } {
      let dsObj = DS.getDSObj(source);
      if (dsObj == null) {
          return {
              schema: null,
              error: "Dataset not found"
          };
      }
      let sourceHasParams = DagNodeInput.checkValidParamBrackets(source, true);
      if (sourceHasParams) {
          return {
              schema: []
          };
      }

      let columns = dsObj.getColumns();
      if (columns == null) {
          console.error("Cannot get schema from the dataset");
          return {
              schema: []
          };
      } else {
          return {
              schema: columns
          };
      }
  }

  /**
   * Rename dsObj
   * DS.rename
   * @param dsId
   * @param newName
   */
  export function rename(dsId: string, newName: string): boolean {
      // now only for folders (later also rename datasets?)
      let dsObj = DS.getDSObj(dsId);
      if (dsObj == null) {
          console.error("error case");
          return false;
      }
      let $label = DS.getGrid(dsId).find("> .label");
      let oldName = dsObj.getName();
      let hasRename = false;

      if (newName === oldName || newName === "") {
          $label.html(oldName);
          hasRename = false;
      } else if (dsObj.rename(newName)) {
          // valid rename
          $label.html(newName)
              .data("dsname", newName)
              .attr("data-dsname", newName)
              .attr("title", newName);
          hasRename = true;
      } else {
          $label.html(oldName);
          hasRename = false;
      }

      DataSourceManager.truncateLabelName($label);
      return hasRename;
  }

  /**
   * helper function to find grid, mainly used in unit test
   * DS.getGridByName
   * @param dsName
   * @param user
   */
  export function getGridByName(dsName: string, user?: string): JQuery | null {
      if (dsName == null) {
          return null;
      }
      // now only check dataset name conflict
      user = user || getCurrentUserName();
      let $grid = $gridView.find('.grid-unit[data-dsname="' + dsName + '"]');
      let $ds = $grid.filter(function() {
          // only check the dataset in user's namespace
          return $(this).data("user") === user;
      });

      if ($ds.length > 0) {
          return $ds;
      } else {
          return null;
      }
  };

  /**
   * DS.getUniqueName
   * @param name
   */
  export function getUniqueName(name: string): string {
      let originalName: string = name;
      let tries: number = 1;
      let validNameFound: boolean = false;
      while (!validNameFound && tries < 20) {
          if (DS.has(name)) {
              validNameFound = false;
          } else {
              validNameFound = true;
          }

          if (!validNameFound) {
              name = originalName + tries;
              tries++;
          }
      }

      if (!validNameFound) {
          while (DS.has(name) && tries < 100) {
              name = xcHelper.randName(name, 4);
              tries++;
          }
      }
      return name;
  }

  /**
   * Check if the ds's name already exists
   * DS.has
   * @param dsName
   */
  export function has(dsName: string): boolean {
      return (DS.getGridByName(dsName) != null);
  }

  /**
   * Remove dataset/folder
   * DS.remove
   * @param $grids
   */
  export function remove($grids: JQuery): XDPromise<void> {
      if ($grids == null || $grids.length === 0) {
          return PromiseHelper.reject("invalid args");
      }
      let deferred: XDDeferred<void> = PromiseHelper.deferred();
      alertDSRemove($grids)
      .then(() => {
          let dsIds = [];
          $grids.each(function() {
              dsIds.push($(this).data("dsid"));
          });
          cleanDSSelect();
          return removeDSHandler(dsIds);
      })
      .then(() => {
          deferred.resolve();
      })
      .fail(() => {
          focsueOnTracker();
          deferred.reject();
      });

      return deferred.promise();
  }

  /**
   * DS.cancel
   * @param $grid
   */
  export function cancel($grid: JQuery): XDPromise<void> {
      if ($grid == null || $grid.length === 0) {
          return PromiseHelper.reject("invalid args");
      }
      let deferred: XDDeferred<void> = PromiseHelper.deferred();
      if ($grid.hasClass("active")) {
          focusOnForm();
      }
      if (!$grid.hasClass("inActivated")) {
          $grid.removeClass("active").addClass("inactive deleting");
      }

      let txId = $grid.data("txid");
      // if cancel success, it will trigger fail in DS.load, so it's fine
      QueryManager.cancelQuery(txId)
      .then(deferred.resolve)
      .fail((error) => {
          console.error(error);
          // if cancel fails, transaction fail handler will delete the ds
          deferred.reject(error);
      });

      return deferred.promise();
  }

  /**
   * DS.activate
   * @param dsIds
   * @param noAlert
   * @param txId optional, ex. used for tracking progress in dataflow execution
   */
  export function activate(dsIds: string[], noAlert: boolean, txId?: number): XDPromise<void> {
      return activateDS(dsIds, noAlert, txId);
  }

  /**
   * Change dir to parent folder
   * DS.upDir
   */
  export function upDir(): void {
      let dirId = curDirId; // tmp cache
      let parentId = DS.getDSObj(curDirId).getParentId();
      DS.goToDir(parentId);
      pushDirStack(dirId);
  }

  /**
   * Change dir to another folder
   * DS.goToDir
   * @param folderId
   */
  export function goToDir(folderId: string): void {
      if (folderId == null) {
          console.error("Error Folder to go");
          return;
      }

      curDirId = folderId;

      if (curDirId === homeDirId) {
          $backFolderBtn.addClass("xc-disabled");
          $gridMenu.find(".back, .moveUp").addClass("disabled");
      } else {
          $backFolderBtn.removeClass("xc-disabled");
          $gridMenu.find(".back, .moveUp").removeClass("disabled");
      }

      refreshDS();
      let $labels = $gridView.find(".label:visible");
      DataSourceManager.truncateLabelName($labels);
  }

  /**
   * DS.resize
   */
  export function resize(): void {
      let $menu = $("#datastoreMenu");
      if ($menu.hasClass("active") && $gridView.hasClass("listView")) {
          let $allGrids = $gridView.add($("#dsTarget-list .gridItems"));
          let $labels = $allGrids.find(".label:visible");
          DataSourceManager.truncateLabelName($labels, true);
      }
  }

  /**
   * DS.getSortKey
   */
  export function getSortKey(): string {
      return sortKey;
  }

  /**
   * DS.listDatasets
   * returns an array of all visible datasets
   * @param sharedOnly
   */
  export function listDatasets(
      sharedOnly: boolean
  ): {
      path: string,
      suffix: string,
      id: string,
      options: {
          inActivated: boolean,
          size: number
      }
  }[] {
      let list: {
          path: string,
          suffix: string,
          id: string,
          options: {
              inActivated: boolean,
              size: number
          }
      }[] = [];
      let path: string[] = [];
      let folder: DSObj = sharedOnly ? DS.getDSObj(DSObjTerm.SharedFolderId) : homeFolder;
      let isSingleUser: boolean = XVM.isSingleUser();
      populate(folder, path);

      function populate(el: DSObj, path: string[]) {
          if (el.beFolder()) {
              let name: string = el.getName();
              if (name === ".") {
                  name = "";
              }
              if (isSingleUser && name === DSObjTerm.SharedFolder) {
                  return;
              }
              path.push(name);
              el.eles.forEach(function(el) {
                  populate(el, path);
              });
              path.pop();
          } else {
              let suffix: string = "";
              if (path[1] === DSObjTerm.SharedFolder) {
                  suffix = el.getUser();
              }
              list.push({
                  path: path.join("/") + "/" + el.getName(),
                  suffix: suffix,
                  id: el.id,
                  options: {
                      inActivated: !el.isActivated(),
                      size: el.getSize()
                  }
              });
          }
      }
      return list;
  }

  /**
   * DS.getDSBasicInfo
   * @param datasetName
   */
  export function getDSBasicInfo(datasetName: string): XDPromise<any> {
      let deferred: XDDeferred<any> = PromiseHelper.deferred();
      XcalarGetDatasetsInfo(datasetName)
      .then((res) => {
          try {
              var dsInfos = {};
              res.datasets.forEach(function(dataset) {
                  let fullName: string = dataset.datasetName;
                  if (fullName.startsWith(gDSPrefix)) {
                      let name: string = fullName.substring(gDSPrefix.length);
                      dsInfos[name] = {
                          size: dataset.datasetSize,
                          columns: getSchemaMeta(dataset.columns),
                          totalNumErrors: dataset.totalNumErrors,
                          downSampled: dataset.downSampled
                      };
                  }
              });
              deferred.resolve(dsInfos);
          } catch (e) {
              console.error(e);
              deferred.resolve({}); // still resolve
          }
      })
      .fail((error) => {
          console.error(error);
          deferred.resolve({}); // still resolve
      });

      return deferred.promise();
  }

  /**
   * DS.clear
   * Clear dataset/folder in gridView area
   */
  export function clear(): void {
      $gridView.find(".grid-unit").remove();
      $backFolderBtn.addClass("xc-disabled");
      clearDirStack();
      $gridMenu.find(".back, .moveUp").addClass("disabled");
      // reset home folder
      curDirId = homeDirId;
      dsLookUpTable = {};

      homeFolder = createHomeFolder();
      dsLookUpTable[homeFolder.getId()] = homeFolder;
  }

  /**
   * DS.refresh
   * Refresh the gridview area
   */
  export function refresh(): XDPromise<void> {
      return refreshHelper();
  }

  // Create dsObj for new dataset/folder
  function createDS(options: any, dsToReplace?: string): DSObj | null {
      // this will make sure option is a diffent copy of old option
      options = $.extend({}, options);
      // validation check
      if (options.name == null) {
          console.error("Invalid Parameters");
          return null;
      }
      // pre-process
      options.name = options.name.trim();
      options.user = options.user || getCurrentUserName();
      options.parentId = options.parentId || curDirId;
      options.isFolder = options.isFolder || false;
      options.uneditable = options.uneditable || false;

      let parent = DS.getDSObj(options.parentId);
      let unlistable = options.unlistable || false;
      delete options.unlistable; // unlistable is not part of ds attr

      if (options.isFolder) {
          var i = 1;
          var name = options.name;
          var validName = name;
          // only check folder name as ds name cannot confilct
          while (parent.checkNameConflict(options.id, validName, true))
          {
              validName = name + ' (' + i + ')';
              ++i;
          }
          options.name = validName;
          options.fullName = options.fullName || options.name;
          options.id = options.id || getNewFolderId();
      } else {
          options.fullName = options.fullName ||
                              xcHelper.wrapDSName(options.name);
          // for dataset, use it's full name as id
          options.id = options.id || options.fullName;
          options.activated = options.activated || false;
      }
      let dsObj = new DSObj(options);
      // dsObj.addToParent();
      let $ds = options.uneditable ? $(getUneditableDSHTML(dsObj)) :
                                     $(getDSHTML(dsObj));

      if (unlistable && !options.isFolder) {
          $ds.addClass("unlistable noAction");
          xcTooltip.add($ds, {
              "title": DSTStr.Unlistable
          });
      }

      let dsObjToReplace = DS.getDSObj(dsToReplace);
      let $gridToReplace = null;
      if (dsObjToReplace != null) {
          // when replace ds
          $gridToReplace = DS.getGrid(dsToReplace);
      }

      if ($gridToReplace != null) {
          $gridToReplace.after($ds);
          // hide replaced grid first and then delete
          // use .xc-hidden is not good because refreshDS() may display it
          $gridToReplace.hide();
          delDSHelper($gridToReplace, dsObjToReplace, {
              // it fail, show it back
              "failToShow": true,
              "noDeFocus": true
          });
      } else {
          $gridView.append($ds);
      }

      DataSourceManager.truncateLabelName($ds.find(".label"));

      // cached in lookup table
      dsLookUpTable[dsObj.getId()] = dsObj;

      return dsObj;
  }

  function createHomeFolder(): DSObj {
      return new DSObj({
          "id": homeDirId,
          "name": DSObjTerm.homeDir,
          "fullName": DSObjTerm.homeDir,
          "user": getCurrentUserName(),
          "parentId": DSObjTerm.homeParentId,
          "uneditable": false,
          "isFolder": true
      });
  }

  function createSharedFolder(): DSObj {
      let folder = createDS({
          "id": DSObjTerm.SharedFolderId,
          "name": DSObjTerm.SharedFolder,
          "parentId": homeDirId,
          "isFolder": true,
          "uneditable": true,
          "user": DSObjTerm.SharedFolder
      });
      let $grid = DS.getGrid(DSObjTerm.SharedFolderId);
      // grid should be the first on in grid view
      $grid.prependTo($gridView);
      if (XVM.isSingleUser()) {
          // single user deployment don't show it
          $grid.remove();
      }
      return folder;
  }

  function isInSharedFolder(dirId: string): boolean {
      return false
      let dsObj: DSObj;
      while (dirId !== homeDirId && dirId !== DSObjTerm.SharedFolderId) {
          dsObj = DS.getDSObj(dirId);
          dirId = dsObj.getParentId();
      }
      return (dirId === DSObjTerm.SharedFolderId);
  }

  // XXX TODO, imporve it to accept multiple dsIds,
  // and only commit once
  /**
   * DS.share
   * @param dsId
   */
  export function share(dsId: string): XDPromise<void> {
      return shareDS(dsId, true);
  }

  function shareDS(dsId: string, noAlert: boolean): XDPromise<void> {
      if (disableShare) {
          return PromiseHelper.resolve();
      }
      let dsObj = DS.getDSObj(dsId);
      if (dsObj == null) {
          // invalid id
          return PromiseHelper.resolve();
      }
      if (isInSharedFolder(dsObj.getParentId())) {
          // already in share folder
          return PromiseHelper.resolve();
      }
      let name = dsObj.getName();
      let msg = xcStringHelper.replaceMsg(DSTStr.ShareDSMsg, {name: name});
      let sharedName = getSharedName(dsId, name);

      if (name !== sharedName) {
          // in case this name is taken
          name = sharedName;
          msg += " " + xcStringHelper.replaceMsg(DSTStr.RenameMsg, {name: name});
      }

      let alertDeferred: XDDeferred<void> = PromiseHelper.deferred();
      if (!noAlert) {
          Alert.show({
              title: DSTStr.ShareDS,
              msg: msg,
              onConfirm: () => {
                  alertDeferred.resolve()
              },
              onCancel: () => {
                  alertDeferred.reject();
              }
          });
      } else {
          alertDeferred.resolve();
      }

      let deferred: XDDeferred<void> = PromiseHelper.deferred();
      alertDeferred.promise()
      .then(() => {
          return shareAndUnshareHelper(dsId, name, true);
      })
      .then(deferred.resolve)
      .fail(deferred.reject);

      return deferred.promise();
  }

  function getSharedName(dsId: string, name: string): string {
      let $sharedDS: JQuery = $gridView.find('.grid-unit.shared[data-dsname="' + name + '"]');
      if ($sharedDS.length) {
          // in case this name is taken
          let uniqueId = dsId.split(".")[1];
          name = DS.getUniqueName(name + uniqueId);
      }
      return name;
  }

  function unshareDS(dsId: string): void {
      let dsObj = DS.getDSObj(dsId);
      let name = dsObj.getName();
      let msg = xcStringHelper.replaceMsg(DSTStr.UnshareDSMsg, {
          name: name
      });
      let $unsharedDS = $gridView.find('.grid-unit:not(.shared)' +
                                       '[data-dsname="' + name + '"]');
      if ($unsharedDS.length) {
          // in case this name is taken
          name = DS.getUniqueName(name);
          msg += " " + xcStringHelper.replaceMsg(DSTStr.RenameMsg, {name: name});
      }

      Alert.show({
          title: DSTStr.UnshareDS,
          msg: msg,
          onConfirm: () => {
              // XXX TODO: check if it's still necessary
              // unshare case need to check if ds is used by others
              checkDSUser(dsObj.getFullName())
              .then(() => {
                  shareAndUnshareHelper(dsId, name, false);
              })
              .fail((error) => {
                  if (error.status === StatusT.StatusDsNotFound) {
                      // that's a normal case
                      shareAndUnshareHelper(dsId, name, false);
                  } else {
                      Alert.error(DSTStr.UnshareFail, error.error);
                  }
              });
          }
      });
  }

  function shareAndUnshareHelper(
      dsId: string,
      newName: string,
      isShare: boolean
  ): XDPromise<void> {
      let deferred: XDDeferred<void> = PromiseHelper.deferred();
      let dirId: string = isShare ? DSObjTerm.SharedFolderId : DSObjTerm.homeDirId;
      let dsObj = DS.getDSObj(dsId);
      removeDS(dsId);

      let options = $.extend(dsObj, {
          name: newName,
          parentId: dirId
      });
      let newDSObj = createDS(options);
      let arg;

      if (isShare) {
          arg = {
              dir: DSObjTerm.SharedFolderId,
              action: "add",
              ds: newDSObj
          };
      } else {
          arg = {
              dir: DSObjTerm.SharedFolderId,
              action: "delete",
              dsIds: [dsId]
          };
      }

      sortDS(dirId);
      DS.updateNumDS();

      commitSharedFolderChange(arg, false)
      .then(() => {
          commitDSChange();
          goToDirHelper(dirId);
          deferred.resolve();
      })
      .fail(deferred.reject);

      return deferred.promise();
  }

  function syncVersionId(): void {
      let versionId = dsInfoMeta.getVersionId();
      XcSocket.Instance.sendMessage("ds", {
          event: "updateVersionId",
          id: versionId
      });
  }

  function startChangeSharedDSInfo(versionId, arg): XDPromise<void> {
      let deferred: XDDeferred<void> = PromiseHelper.deferred();
      let callback = function(success) {
          if (success) {
              deferred.resolve();
          } else {
              deferred.reject();
          }
      };

      arg = $.extend({
          event: "changeStart",
          id: versionId
      }, arg);
      XcSocket.Instance.sendMessage("ds", arg, callback);
      return deferred.promise();
  }

  function endChangeSharedDSInfo(versionId: number): XDPromise<void> {
      let deferred: XDDeferred<void> = PromiseHelper.deferred();
      let callback = function(success) {
          if (success) {
              deferred.resolve();
          } else {
              deferred.reject();
          }
      };

      let arg = {
          event: "changeEnd",
          id: versionId
      };
      XcSocket.Instance.sendMessage("ds", arg, callback);
      return deferred.promise();
  }

  function errorChangeSharedDSInfo(versionId: number): void {
      XcSocket.Instance.sendMessage("ds", {
          event: "changeError",
          id: versionId
      });
  }

  function commitSharedFolderChange(
      arg: any,
      noRefresh: boolean
  ): XDPromise<void> {
      let deferred: XDDeferred<void> = PromiseHelper.deferred();
      let versionId = dsInfoMeta.updateVersionId();
      let sharedDir = DS.getSharedDir(true);
      let hasCommit: boolean = false;
      dsInfoMeta.updateDSInfo(<DSDurable>sharedDir);

      startChangeSharedDSInfo(versionId, arg)
      .then(() => {
          let key = KVStore.getKey("gSharedDSKey");
          let kvStore = new KVStore(key, gKVScope.GLOB);
          return kvStore.put(dsInfoMeta.serialize(), true);
      })
      .then(() => {
          hasCommit = true;
          return endChangeSharedDSInfo(versionId);
      })
      .then(deferred.resolve)
      .fail((error) => {
          console.error(error);
          if (!hasCommit) {
              errorChangeSharedDSInfo(versionId);
          }
          if (!noRefresh) {
              // when fail, force to refresh
              refreshHelper();
          }
          deferred.reject(error);
      });

      return deferred.promise();
  }

  function commitDSChange(): void {
      UserSettings.commit(false, true);
  }

  function changeDSInfo(chanedDirId: string, arg: any): void {
      sortDS(chanedDirId);
      if (isInSharedFolder(chanedDirId)) {
          arg = $.extend({dir: chanedDirId}, arg);
          commitSharedFolderChange(arg, false);
      } else {
          commitDSChange();
      }
  }

  /**
   * DS.updateDSInfo
   * @param arg
   */
  export function updateDSInfo(arg: any): void {
      try {
          let dsIds;
          switch (arg.action) {
              case "add":
                  let dsObj = DS.getDSObj(arg.ds.id);
                  if (dsObj != null) {
                      let msg = xcStringHelper.replaceMsg(DSTStr.ForceShareMsg, {
                          name: dsObj.getName()
                      });
                      removeDS(dsObj.getId());
                      Alert.show({
                          title: DSTStr.ShareDS,
                          msg: msg,
                          isAlert: true
                      });
                  }
                  createDS(arg.ds);
                  refreshDS();
                  break;
              case "rename":
                  DS.rename(arg.dsId, arg.newName);
                  break;
              case "drop":
                  dropHelper(arg.dsId, arg.targetId);
                  refreshDS();
                  break;
              case "delete":
                  dsIds = arg.dsIds || [];
                  dsIds.forEach(removeDS);
                  break;
              case "activate":
                  dsIds = arg.dsIds || [];
                  dsIds.forEach(function(dsId) {
                      var dsObj = DS.getDSObj(dsId);
                      if (dsObj != null) {
                          activateDSObj(dsObj);
                      }
                  });
                  break;
              case "deactivate":
                  dsIds = arg.dsIds || [];
                  dsIds.forEach(deactivateDSObj);
                  break;
              default:
                  console.error("Unspported action!");
                  return;
          }

          sortDS(arg.dir);
          dsInfoMeta.setVersionId(arg.id);
      } catch (e) {
          console.error(e);
      }
  }

  function createDSHelper(
      txId: number,
      dsObj: DSObj,
      restoreArgs: object
  ): XDPromise<void> {
      let datasetName = dsObj.getFullName();
      let def: XDPromise<void>;
      if (restoreArgs) {
          def = XcalarDatasetRestore(datasetName, restoreArgs);
      } else {
          let options = dsObj.getImportOptions();
          def = XcalarDatasetCreate(datasetName, options);
      }
      let hasCreate: boolean = false;
      let deferred: XDDeferred<void> = PromiseHelper.deferred();
      def
      .then(() => {
          hasCreate = true;
          // only when there is active workbook will activate the ds
          if (WorkbookManager.getActiveWKBK() != null) {
              return activateHelper(txId, dsObj);
          }
      })
      .then(deferred.resolve)
      .fail((error) => {
          if (typeof error !== "object") {
              error = {"error": error};
          }
          error.created = hasCreate;
          if (error.status === StatusT.StatusExist) {
              // special case, need refresh to verify
              DS.refresh()
              .then(function() {
                  let $ds = DS.getGrid(datasetName);
                  if ($ds != null && $ds.length) {
                      deferred.resolve();
                  } else {
                      deferred.reject(error);
                  }
              })
              .fail(function() {
                  deferred.reject(error);
              });
          } else {
              // if already created, remove the dataset from backend
              // as the creation failed
              if (hasCreate) {
                  XcalarDatasetDelete(datasetName);
              }
              deferred.reject(error);
          }
      });

      return deferred.promise();
  }

  function updateDSMetaHelper(dsMeta, ds) {
      dsMeta = dsMeta || {};
      ds.setSize(dsMeta.size);
      ds.setColumns(dsMeta.columns);
      ds.setNumErrors(dsMeta.totalNumErrors);
  }

  function importHelper(
      dsObj: DSObj,
      sql: object,
      restoreArgs: object
  ): XDPromise<DSObj> {
      let deferred: XDDeferred<DSObj> = PromiseHelper.deferred();
      let dsName = dsObj.getName();
      let $grid = DS.getGrid(dsObj.getId());
      let updateDSMeta = function(dsMeta, ds, $ds) {
          updateDSMetaHelper(dsMeta, ds);
          $ds.find(".size").text(ds.getDisplaySize());
      };
      let datasetName = dsObj.getFullName();

      $grid.addClass('inactive').append('<div class="waitingIcon"></div>');
      $grid.find('.waitingIcon').fadeIn(200);
      $grid.addClass('loading');

      DS.updateNumDS();

      let txId = Transaction.start({
          "msg": StatusMessageTStr.ImportDataset + ": " + dsName,
          "operation": SQLOps.DSImport,
          "sql": sql,
          "track": true,
          "steps": 1
      });

      $grid.data("txid", txId);

      // focus on grid before load
      DS.focusOn($grid)
      .then(() => {
          return createDSHelper(txId, dsObj, restoreArgs);
      })
      .then(() => {
          return DS.getDSBasicInfo(datasetName);
      })
      .then((dsInfos) => {
          let dsInfo = dsInfos[datasetName];
          updateDSMeta(dsInfo, dsObj, $grid);
          finishImport($grid);
          if ($grid.hasClass("active")) {
              DS.focusOn($grid);
          }

          if (dsInfo && dsInfo.downSampled === true) {
              alertSampleSizeLimit(datasetName);
          }

          commitDSChange();
          let msgOptions = {
              "newDataset": true,
              "datasetId": dsObj.getId()
          };
          Transaction.done(txId, {
              msgOptions: msgOptions
          });
          deferred.resolve(dsObj);
      })
      .fail((error) => {
          let created = false;
          let displayError = null;
          if (typeof error === "object") {
              created = error.created;
              displayError = error.error;
          }

          if (typeof error === "object" &&
              error.status === StatusT.StatusCanceled)
          {
              if (!created) {
                  removeDS(dsObj.getId());
              }
              if ($grid.hasClass("active")) {
                  focusOnForm();
              }
          } else {
              handleImportError(dsObj, displayError, created);
          }

          if (created) {
              finishImport($grid);
          }

          Transaction.fail(txId, {
              "failMsg": StatusMessageTStr.ImportDSFailed,
              "error": displayError
          });

          deferred.reject(error);
      })
      .always(() => {
          loadCleanup();
      });

      return deferred.promise();
  }

  function alertSampleSizeLimit(dsName: string): void {
      let msg = xcStringHelper.replaceMsg(DSTStr.OverSampleSize , {
          name: dsName,
          size: xcHelper.sizeTranslator(gMaxSampleSize)
      })
      Alert.show({
          title: AlertTStr.Title,
          msg: msg,
          isAlert: true
      });
  }

  function finishActivate($grid: JQuery): void {
      $grid.removeData("txid");
      $grid.removeClass("loading");
  }

  function finishImport($grid: JQuery): void {
      finishActivate($grid);
      $grid.removeClass("inactive").find(".waitingIcon").remove();
      $grid.addClass("notSeen");
      // display new dataset
      refreshDS();
  }

  function loadCleanup(): void {
      xcTooltip.hideAll();
  }

  function handleImportError(
      dsObj: DSObj,
      error: string,
      created: boolean
  ): void {
      let dsId = dsObj.getId();
      let $grid = DS.getGrid(dsId);
      if ($grid.hasClass("active")) {
          dsObj.setError(error);
          cacheErrorDS(dsId, dsObj);
      }
      if (!created) {
          removeDS(dsId);
      }
      commitDSChange();
  }

  function delDSHelper(
      $grid: JQuery,
      dsObj: DSObj,
      options: {
          noDeFocus?: boolean,
          failToShow?: boolean,
          noAlert?: boolean,
          txId?: number
      }
  ): XDPromise<void> {
      options = options || {};
      let dsName = dsObj.getFullName();
      let dsId = dsObj.getId();
      let noDeFocus: boolean = (options.noDeFocus ||  false);
      let failToShow: boolean = options.failToShow || false;

      $grid.removeClass("active")
           .addClass("inactive deleting")
           .append('<div class="waitingIcon"></div>');

      $grid.find(".waitingIcon").fadeIn(200);

      let deferred: XDDeferred<void> = PromiseHelper.deferred();
      destroyDataset(dsName, options.txId)
      .then(() => {
          // remove ds obj
          removeDS(dsId);
          if (!noDeFocus) {
              focusOnForm();
          }

          deferred.resolve();
      })
      .fail((error) => {
          $grid.find('.waitingIcon').remove();
          $grid.removeClass("inactive")
               .removeClass("deleting");

          if (failToShow) {
              $grid.show();
          }
          deferred.reject(error);
      });

      return deferred.promise();
  }

  function checkDSUser(dsName: string): XDPromise<void> {
      let deferred: XDDeferred<void> = PromiseHelper.deferred();
      let currentUser = getCurrentUserName();

      XcalarGetDatasetUsers(dsName)
      .then((users) => {
          let otherUsers: string[] = [];
          users.forEach((user) => {
              let name = user.userId.userIdName;
              if (currentUser !== name) {
                  otherUsers.push(name);
              }
          });
          if (otherUsers.length > 0) {
              let error = xcStringHelper.replaceMsg(DSTStr.DSUsed, {
                  "users": otherUsers.join(",")
              });
              deferred.reject({error: error});
          } else {
              deferred.resolve();
          }
      })
      .fail(deferred.reject);

      return deferred.promise();
  }

  function cacheErrorDS(dsId: string, dsObj: DSObj): void {
      errorDSSet[dsId] = dsObj;
  }

  function alertDSRemove($grids: JQuery): XDPromise<void> {
      let deferred: XDDeferred<void> = PromiseHelper.deferred();
      let title: string;
      let msg: string;
      let isAlert: boolean = false;

      if ($grids.length > 1) {
          // delete multiple ds/folder
          title = DSTStr.DelDS;
          msg = DSTStr.DelMultipleDS;
      } else {
          let $grid = $grids.eq(0);
          let txId: number = $grid.data("txid");
          let dsId: string = $grid.data("dsid");
          let dsObj = DS.getDSObj(dsId);
          let dsName = dsObj.getName();

          if (dsObj.beFolder()) {
              // skip folder case
              return PromiseHelper.resolve();
          } else if (dsObj.isActivated()) {
              title = AlertTStr.NoDel;
              msg = xcStringHelper.replaceMsg(DSTStr.DelActivatedDS, {
                  "ds": dsName
              });
              isAlert = true;
          } else if (txId != null) {
              // cancel case
              title = DSTStr.CancelPoint;
              msg = xcStringHelper.replaceMsg(DSTStr.CancelPointMsg, {
                  "ds": dsName
              });
          } else {
              // when remove ds
              title = DSTStr.DelDS;
              msg = xcStringHelper.replaceMsg(DSTStr.DelDSConfirm, {
                  "ds": dsName
              });
          }
      }

      Alert.show({
          "title": title,
          "msg": msg,
          "onConfirm": function() { deferred.resolve(); },
          "onCancel": function() { deferred.reject(); },
          "isAlert": isAlert
      });

      return deferred.promise();
  }

  function hideUnlistableDS(dsSet): void {
      let currentUser = getCurrentUserName();
      for (let dsId in dsSet) {
          let dsObj = DS.getDSObj(dsId);
          let $grid = DS.getGrid(dsId);
          if (dsObj != null && dsObj.getUser() === currentUser) {
              // when it's the currentUser's ds, can try to delete it
              // tryRemoveUnlistableDS($grid, dsObj);
          } else {
              $grid.hide();
          }
      }
  }

  function highlighSortKey(key: string): void {
      key = key || "none";
      var $sortOptions = $("#dsListSection .sortSection .sortOption");
      $sortOptions.removeClass("key");
      $sortOptions.filter(function() {
          return $(this).data("key") === key;
      }).addClass("key");
  }

  function setSortKey(key: string): void {
      if (key === sortKey) {
          return;
      }
      if (key === "none") {
          sortKey = null;
      } else {
          sortKey = key;
          sortDS();
      }
      highlighSortKey(sortKey);
      commitDSChange();
  }

  function sortDS(dirId?: string): void {
      if (!sortKey) {
          // already sorted
          return;
      }

      if (dirId != null) {
          // sort only when folder
          var folderObj = DS.getDSObj(dirId);
          sortOneFolder(folderObj);
      } else {
          // sort all folders
          var queue = [homeFolder];
          while (queue.length) {
              var folder = queue.shift();
              var childFolders = sortOneFolder(folder);
              queue = queue.concat(childFolders);
          }
      }
  }

  function sortOneFolder(folderObj: DSObj): DSObj[] {
      let childFolders: DSObj[] = [];
      let childDatasets: DSObj[] = [];
      let reorderEles: DSObj[] = [];
      let sharedFolder: DSObj = null;

      folderObj.eles.forEach(function(dsObj) {
          var dsId = dsObj.getId();
          if (dsId === DSObjTerm.SharedFolderId) {
              sharedFolder = dsObj;
          } else {
              reorderEles.push(dsObj);
          }
      });

      // sort by name first
      reorderEles.sort(function(dsObj1, dsObj2) {
          var name1 = dsObj1.getName().toLowerCase();
          var name2 = dsObj2.getName().toLowerCase();
          return (name1 < name2 ? -1 : (name1 > name2 ? 1 : 0));
      });

      if (sortKey === "type" || sortKey === "size") {
          reorderEles.forEach(function(dsObj) {
              if (dsObj.beFolder()) {
                  childFolders.push(dsObj);
              } else {
                  childDatasets.push(dsObj);
              }
          });

          if (sortKey === "type") {
              reorderEles = childFolders.concat(childDatasets);
          } else if (sortKey === "size") {
              childDatasets.sort(function(dsObj1, dsObj2) {
                  var size1 = dsObj1.getSize();
                  var size2 = dsObj2.getSize();
                  return (size1 < size2 ? -1 : (size1 > size2 ? 1 : 0));
              });
              reorderEles = childFolders.concat(childDatasets);
          }
      }

      if (sharedFolder != null) {
          reorderEles.unshift(sharedFolder);
          childFolders.unshift(sharedFolder);
      }

      // reorder the grids and ds meta
      reorderEles.forEach(function(dsObj) {
          var $grid = DS.getGrid(dsObj.getId());
          $gridView.append($grid);
      });
      folderObj.eles = reorderEles;
      return childFolders;
  }

  function destroyDataset(dsName, txId) {
      var deferred = PromiseHelper.deferred();

      XcalarDatasetDelete(dsName, txId)
      .then(deferred.resolve)
      .fail(function(error) {
          if (error.status === StatusT.StatusNsNotFound ||
              error.status === StatusT.StatusDsNotFound)
          {
              // this error means the ds is not created,
              // it's nomral when import ds fail but gui still has
              // the grid icon
              deferred.resolve();
          } else {
              deferred.reject(error);
          }
      });

      return deferred.promise();
  }

  function removeDSHandler(dsIds) {
      var deferred = PromiseHelper.deferred();
      var failures = [];
      var promises = [];
      var datasets = [];
      var folders = [];
      var dirId = curDirId;
      const dsNames: string[] = [];
      dsIds.forEach((dsId) => {
          const dsObj = DS.getDSObj(dsId);
          if (!dsObj.beFolder()) {
              dsNames.push(dsObj.getName());
          }
      });
      let txId;
      if (dsNames.length) { // no transaction if only deleting folders
          let sql = {
              "operation": SQLOps.DestroyDS,
              "dsNames": dsNames,
              "dsIds": dsIds
          };
          txId = Transaction.start({
              "operation": SQLOps.DestroyDS,
              "sql": sql,
              "track": true,
              "steps": dsNames.length
          });
      }

      dsIds.forEach(function(dsId) {
          promises.push(removeOneDSHelper(dsId, failures, datasets, folders, txId));
      });

      PromiseHelper.when.apply(this, promises)
      .then(function() {
          if (failures.length) {
              Alert.show({
                  "title": AlertTStr.NoDel,
                  "msg": failures.join("\n"),
                  "isAlert": true,
                  "onCancel": focsueOnTracker
              });
          } else {
              focsueOnTracker();
          }

          var removedDSIds = datasets.concat(folders);
          if (datasets.length) {
              // when has delete datsets
              changeDSInfo(dirId, {
                  action: "delete",
                  dsIds: removedDSIds
              });
              commitDSChange();
              MemoryAlert.Instance.check(true);
              Transaction.done(txId, {
                  "noCommit": true
              });
          } else if (folders.length) {
              changeDSInfo(dirId, {
                  action: "delete",
                  dsIds: removedDSIds
              });
              if (dsNames.length) {
                  Transaction.fail(txId, {
                      "failMsg": DSTStr.DelDSFail,
                      "error": failures[0],
                      "noAlert": true
                  });
              }
          } else {
              Transaction.fail(txId, {
                  "failMsg": DSTStr.DelDSFail,
                  "error": failures[0],
                  "noAlert": true
              });
          }

          deferred.resolve();
      })
      .fail(deferred.reject); // should not have any reject case

      return deferred.promise();
  }

  function removeOneDSHelper(dsId, failures, datasets, folders, txId) {
      var dsObj = DS.getDSObj(dsId);
      var dsName = dsObj.getName();
      var err;

      if (dsObj.isActivated()) {
          // delete activated ds
          err = xcStringHelper.replaceMsg(DSTStr.DelActivatedDS, {
              "ds": dsName
          });
          failures.push(err);
          return PromiseHelper.resolve();
      } else if (dsObj.beFolder()) {
          // delete folder
          if (!dsObj.isEditable()) {
              // delete uneditable folder/ds
              err = xcStringHelper.replaceMsg(DSTStr.DelUneditable, {
                  "ds": dsName
              });
              failures.push(err);
          } else if (!removeFolderRecursive(dsId)) {
              err = xcStringHelper.replaceMsg(DSTStr.FailDelFolder, {
                  "folder": dsName
              });
              failures.push(err);
          } else {
              folders.push(dsId);
          }

          return PromiseHelper.resolve();
      } else {
          var deferred = PromiseHelper.deferred();
          var $grid = DS.getGrid(dsId);
          var isCanel = ($grid.data("txid") != null);
          var def = isCanel
                    ? DS.cancel($grid)
                    : delDSHelper($grid, dsObj, {
                        "noAlert": true,
                        "txId": txId
                      });
          def
          .then(function() {
              datasets.push(dsId);
              deferred.resolve();
          })
          .fail(function(error) {
              if (typeof error === "object" && error.error) {
                  error = error.error;
              }
              var msg = isCanel ? DSTStr.FailCancelDS : DSTStr.FailDelDS;
              error = xcStringHelper.replaceMsg(msg, {
                  "ds": dsName,
                  "error": error
              });
              failures.push(error);
              // still resolve it
              deferred.resolve();
          });

          return deferred.promise();
      }
  }

  function removeFolderRecursive(dsId) {
      var dsObj = DS.getDSObj(dsId);
      if (dsObj.beFolderWithDS()) {
          return false;
      }

      var stack = dsObj.eles;
      while (stack.length !== 0) {
          var childDsObj = stack.pop();
          stack = stack.concat(childDsObj.eles);
          removeDS(childDsObj.getId());
      }

      removeDS(dsId);
      return true;
  }

  // Helper function to remove ds
  function removeDS(dsId) {
      var dsObj = DS.getDSObj(dsId);
      if (dsObj == null) {
          // error case;
          return;
      }
      dsObj.removeFromParent();
      removeDSMeta(dsId);
      DS.updateNumDS();
  }

  function removeDSMeta(dsId) {
      var $grid = DS.getGrid(dsId);
      // delete ds
      delete dsLookUpTable[dsId];
      $grid.remove();
  }

  // Refresh dataset/folder display in gridView area
  function refreshDS() {
      $gridView.find(".grid-unit").addClass("xc-hidden");
      $gridView.find('.grid-unit[data-dsparentid="' + curDirId + '"]')
              .removeClass("xc-hidden");

      var dirId = curDirId;
      var path = "";
      var count = 0;
      while (dirId !== homeDirId) {
          var dsObj = DS.getDSObj(dirId);
          if (dsObj == null) {
              // handle error case
              console.error("error case");
              return;
          }
          // only the last two folder show the name
          var name;
          if (count < 2) {
              if (dirId === curDirId) {
                  name = dsObj.getName();
              } else {
                  name = '<span class="path" data-dir="' + dirId + '">' +
                              dsObj.getName() +
                          '</span>';
              }
          } else {
              name = '...';
          }

          path = name + " / " + path;
          dirId = dsObj.getParentId();
          count++;
      }

      if (curDirId === homeDirId) {
          path = DSTStr.Home + "/" + path;
      } else {
          path = '<span class="path" data-dir="' + homeDirId + '">' +
                      DSTStr.Home +
                  '</span>' +
                  " / " + path;
      }

      $("#dsListSection .pathSection").html(path);
  }

  function focusOnForm(): void {
      DataSourceManager.startImport(false);
  }

  function restoreDS(
      oldHomeFolder: DSDurable,
      atStartUp: boolean
  ): XDPromise<void> {
      let deferred: XDDeferred<void> = PromiseHelper.deferred();
      let datasets;
      let dsBasicInfo;

      DS.clear();

      XcalarGetDatasets()
      .then((res) => {
          datasets = res;
          return DS.getDSBasicInfo(null);
      })
      .then((res) => {
          dsBasicInfo = res;
          let key = KVStore.getKey("gSharedDSKey");
          let sharedDSKV = new KVStore(key, gKVScope.GLOB);
          return sharedDSKV.getInfo(true);
      })
      .then((res) => {
          let oldSharedDSInfo = res;
          let datasetsSet = getDSBackendMeta(datasets, dsBasicInfo, atStartUp);
          restoreHelper(oldHomeFolder, oldSharedDSInfo, datasetsSet);
          deferred.resolve();
      })
      .fail((error) => {
          console.error("Restore DS fails!", error);
          deferred.reject(error);
      });

      return deferred.promise();
  }

  /**
   * DS.getSchemaMeta
   * @param schemaArray
   */
  export function getSchemaMeta(
      schemaArray: {name: string, type: string}[]
  ): ColSchema[] {
      let columns: ColSchema[] = [];
      let indexMap = {};
      schemaArray.forEach((colInfo) => {
          // if the col name is a.b, in XD it should be a\.b
          let name = xcHelper.escapeColName(colInfo.name);
          let type = xcHelper.convertFieldTypeToColType(DfFieldTypeT[colInfo.type]);
          let index = indexMap[name];
          if (index == null) {
              // new columns
              index = columns.length;
              indexMap[name] = index;
              columns.push({
                  name: name,
                  type: type
              });
          } else {
              // that's a mixed column
              columns[index].type = ColumnType.mixed;
          }
      });
      return columns;
  }

  function getDSBackendMeta(
      datasets: any,
      basicDSInfo: any,
      atStartUp: boolean
  ): any {
      let numDatasets: number = datasets.numDatasets;
      let userPrefix = xcHelper.getUserPrefix();
      let datasetsSet = {};

      for (let i = 0; i < numDatasets; i++) {
          let dataset = datasets.datasets[i];
          let dsName: string = dataset.name;

          if (dsName.endsWith("-xcalar-preview")) {
              if (!atStartUp) {
                  // if not the start up time, not deal with it
                  continue;
              }
              // other users don't deal with it
              if (xcHelper.parseDSName(dsName).user !== userPrefix) {
                  continue;
              }
              // deal with preview datasets,
              // if it's the current user's preview ds,
              // then we delete it on start up time
              let sql = {
                  "operation": SQLOps.DestroyPreviewDS,
                  "dsName": dsName
              };
              let txId = Transaction.start({
                  "operation": SQLOps.DestroyPreviewDS,
                  "sql": sql,
                  "track": true,
                  "steps": 1
              });

              XIApi.deleteDataset(txId, dsName, true)
              .then(() => {
                  Transaction.done(txId, {
                      "noCommit": true,
                      "noLog": true
                  });
              })
              .fail((error) => {
                  Transaction.fail(txId, {
                      "error": error,
                      "noAlert": true
                  });
              });

              continue;
          } else if (dsName.endsWith(PTblManager.DSSuffix)) {
              // other users don't deal with it
              if (xcHelper.parseDSName(dsName).user !== userPrefix) {
                  continue;
              } else if (dataset.loadIsComplete) {
                  PTblManager.Instance.addDatasetTable(dsName);
              } else {
                  deleteTempDS(dsName);
              }
              continue;
          }

          if (!dataset.isListable) {
              // skip unlistable ds
              continue;
          }

          dataset.activated = dataset.loadIsComplete;

          if (basicDSInfo.hasOwnProperty(dsName)) {
              dataset.size = basicDSInfo[dsName].size;
              dataset.columns = basicDSInfo[dsName].columns;
              dataset.numErrors = basicDSInfo[dsName].totalNumErrors;
          }

          datasetsSet[dsName] = dataset;
      }
      return datasetsSet;
  }

  function restoreDir(oldFolder: DSDurable, datasetsSet: any): void {
      let cache = $.isEmptyObject(oldFolder) ? [] : oldFolder.eles;
      // restore the ds and folder
      while (cache.length > 0) {
          let obj: any = cache.shift();
          if (obj == null) {
              console.error("error case");
              continue;
          }
          if (obj.id === DSObjTerm.SharedFolderId) {
              // restore of shared folder will be taken cared by
              // restoreSharedDS
              continue;
          }
          if (obj.id === ".other") {
              // old structure, not restore
              continue;
          }

          if (obj.isFolder) {
              // restore a folder
              createDS(obj);
              if (obj.eles != null) {
                  $.merge(cache, obj.eles);
              }
          } else {
              if (datasetsSet.hasOwnProperty(obj.fullName)) {
                  // restore a ds
                  let ds = datasetsSet[obj.fullName];
                  let backOptions = getDSOptions(ds);
                  let sources = obj.sources;
                  if (!sources || sources.length === 0) {
                      sources = backOptions.sources;
                  }
                  obj = $.extend(obj, backOptions, {
                      "sources": sources
                  });
                  createDS(obj);
                  // mark the ds to be used
                  delete datasetsSet[obj.fullName];
              } else {
                  // when ds has front meta but no backend meta
                  // this is a case when front end meta not sync with
                  // backend meta correctly
                  console.error(obj, "has meta but no backend info!");
              }
          }
      }

      return datasetsSet;
  }

  function getDSOptions(ds) {
      return {
          // format should come from kvStore, not from backend
          "sources": ds.loadArgs.sourceArgsList,
          "unlistable": !ds.isListable,
          "activated": ds.activated,
          "size": ds.size,
          "columns": ds.columns,
          "numErrors": ds.numErrors
      };
  }

  function getUnListableDS(datasetsSet) {
      var unlistableDS = {};
      for (var dsName in datasetsSet) {
          var ds = datasetsSet[dsName];
          if (!ds.isListable) {
              unlistableDS[dsName] = true;
          }
      }
      return unlistableDS;
  }

  function restoreHelper(oldHomeFolder, oldSharedDSInfo, datasetsSet) {
      var unlistableDS = getUnListableDS(datasetsSet);
      datasetsSet = restoreSharedDS(oldSharedDSInfo, datasetsSet);
      datasetsSet = restoreDir(oldHomeFolder, datasetsSet);
      // add ds that is not in oldHomeFolder
      restoreNoMetaDS(datasetsSet);

      // UI update
      sortDS();
      refreshDS();
      DS.updateNumDS();
      checkUnlistableDS(unlistableDS);
  }

  function restoreNoMetaDS(datasetsSet) {
      var userPrefix = xcHelper.getUserPrefix();
      var promises = [];
      for (var dsName in datasetsSet) {
          var ds = datasetsSet[dsName];
          if (ds != null) {
              var options = getDSOptions(ds);
              if (xcHelper.parseDSName(dsName).user === userPrefix) {
                  DS.addCurrentUserDS(ds.name, options);
              }
              // if it's not this user's ds, don't handle it
          }
      }
      PromiseHelper.chain(promises);
  }

  function restoreSharedDS(
      oldSharedDSInfo: SharedDSInfoDurable,
      datasetsSet: any
  ): any {
      dsInfoMeta = new SharedDSInfo(oldSharedDSInfo);
      let oldSharedFolder = dsInfoMeta.getDSInfo();
      let sharedFolder = createSharedFolder();
      datasetsSet = restoreDir(oldSharedFolder, datasetsSet);
      dsInfoMeta.updateDSInfo(<any>sharedFolder);
      syncVersionId();
      return datasetsSet;
  }

  function checkUnlistableDS(unlistableDS: object): XDPromise<void> {
      if ($.isEmptyObject(unlistableDS)) {
          return PromiseHelper.resolve();
      }

      let deferred: XDDeferred<void> = PromiseHelper.deferred();
      XcalarGetDSNode()
      .then((ret) => {
          let numNodes: number = ret.numNodes;
          let nodeInfo = ret.nodeInfo;
          for (let i = 0; i < numNodes; i++) {
              let fullDSName: string = nodeInfo[i].name;
              if (unlistableDS.hasOwnProperty(fullDSName)) {
                  let $grid = DS.getGrid(fullDSName);
                  if ($grid != null) {
                      // this ds is unlistable but has table
                      // associate with it
                      $grid.removeClass("noAction");
                      $grid.find(".gridIcon").removeClass("xi_data")
                                             .addClass("xi-data-warning-1");
                  }
                  delete unlistableDS[fullDSName];
              }
          }
          hideUnlistableDS(unlistableDS);
          deferred.resolve();
      })
      .fail(deferred.reject);

      return deferred.promise();
  }

  function setupGridViewButtons(): void {
      // click "Add New Folder" button to add new folder
      $("#addFolderBtn").click(function() {
          DS.newFolder();
      });

      // click "Back Up" button to go back to parent folder
      $backFolderBtn.click(function() {
          DS.upDir();
      });

      $forwardFolderBtn.click(function() {
          popDirStack();
      });
  }

  function setupGrids(): void {
      // refresh dataset
      $("#refreshDS").click(function() {
          refreshHelper();
      });

      $("#dsListSection .pathSection").on("click", ".path", function() {
          let dir = $(this).data("dir");
          goToDirHelper(dir);
      });

      $("#dsListSection .sortSection").on("click", ".sortOption", function() {
          let key = $(this).data("key");
          setSortKey(key);
      });

      $dsListFocusTrakcer.on("keydown", function(event) {
          // pre-check if it's the grid that focusing on
          let dsid = $dsListFocusTrakcer.data("dsid");
          let $grid = DS.getGrid(dsid);
          let $selectedGrids = $gridView.find(".grid-unit.selected");
          if (event.which === keyCode.Delete && $selectedGrids.length) {
              DS.remove($selectedGrids);
              return;
          }

          if ($grid == null || !$grid.hasClass("active")) {
              return;
          }

          let isFolder = $grid.hasClass("folder");
          if (isFolder && $grid.find(".label").hasClass("active")) {
              // don't do anything when renaming
              return;
          }

          switch (event.which) {
              case keyCode.Delete:
                  DS.remove($grid);
                  break;
              case keyCode.Enter:
                  if (isFolder) {
                      renameHelper($grid.find(".label"), dsid);
                      event.preventDefault();
                  }
                  break;
              default:
                  break;
          }
      });

      // click a folder/ds
      $gridView.on("click", ".grid-unit", function(event) {
          event.stopPropagation(); // stop event bubbling
          cleanDSSelect();
          focusDSHelper($(this));
      });

      $gridView.on("click", ".grid-unit .delete", function() {
          var $grid = $(this).closest(".grid-unit");
          // focusDSHelper($grid);
          DS.remove($grid);
          // stop event propogation
          return false;
      });

      $gridView.on("click", ".grid-unit .share", function() {
          let $grid = $(this).closest(".grid-unit");
          shareDS($grid.data("dsid"), false);
          // stop event propogation
          return false;
      });

      $gridView.on("click", ".grid-unit .unshare", function() {
          let $grid = $(this).closest(".grid-unit");
          unshareDS($grid.data("dsid"));
          // stop event propogation
          return false;
      });

      $gridView.on("click", ".grid-unit .edit", function() {
          let $grid = $(this).closest(".grid-unit");
          focusDSHelper($grid);
          let $label = $grid.find(".label");
          renameHelper($label, null);
          // stop event propogation
          return false;
      });

      // Input event on folder
      $gridView.on({
          // press enter to remove focus from folder label
          "keypress": function(event) {
              if (event.which === keyCode.Enter) {
                  event.preventDefault();
                  $(this).blur();
              }
          },
          // make textarea's height flexible
          "keyup": function() {
              let textarea: HTMLElement = <HTMLElement>$(this).get(0);
              // with this, textarea can back to 15px when do delete
              textarea.style.height = "15px";
              textarea.style.height = (textarea.scrollHeight) + "px";
          },

          "click": function(event) {
              // make text are able to click
              event.stopPropagation();
          },

          "blur": function() {
              let $textarea = $(this);
              let $label = $textarea.closest(".label");

              if (!$label.hasClass("focused")) {
                  return;
              }

              let dsId = $label.closest(".grid-unit").data("dsid");
              let newName = $textarea.val().trim();
              let hasRename = DS.rename(dsId, newName);
              if (hasRename) {
                  changeDSInfo(curDirId, {
                      action: "rename",
                      dsId: dsId,
                      newName: newName
                  });
              }

              $label.removeClass("focused");
              xcUIHelper.removeSelectionRange();
              // still focus on the grid-unit
              $dsListFocusTrakcer.data(dsId);
              focsueOnTracker();
          }
      }, ".folder > .label textarea");

      // dbclick to open folder
      $gridView.on("dblclick", ".grid-unit.folder", function() {
          let $grid = $(this);
          goToDirHelper($grid.data("dsid"));
      });

      $("#dsListSection .gridViewWrapper").on("mousedown", function(event) {
          if (event.which !== 1) {
              return;
          }
          let $target = $(event.target);
          if (!$target.closest(".uneditable").length &&
              ($target.closest(".gridIcon").length ||
              $target.closest(".label").length ||
              $target.closest(".dsCount").length))
          {
              // this part is for drag and drop
              return;
          }

          createRectSelection(event.pageX, event.pageY);
      });

      $gridView.on("mouseenter", ".grid-unit.folder", function() {
          if ($gridView.hasClass("listView")) {
              let $folder = $(this);
              let folderId = $folder.data("dsid");
              let dsObj = DS.getDSObj(folderId);
              if (dsObj && dsObj.beFolderWithDS()) {
                  $folder.find(".delete").addClass("xc-disabled");
              } else {
                  $folder.find(".delete").removeClass("xc-disabled");
              }
          }
      });
  }

  function createRectSelection(startX, startY): RectSelection {
      $gridMenu.hide();
      return new RectSelection(startX, startY, {
          "id": "gridView-rectSelection",
          "$container": $("#dsListSection .gridItems"),
          "$scrollContainer": $("#dsListSection .gridViewWrapper"),
          "onStart": function() { $gridView.addClass("drawing"); },
          "onDraw": drawRect,
          "onEnd": endDrawRect
      });
  }

  function drawRect(
      bound: ClientRect,
      rectTop: number,
      rectRight: number,
      rectBottom: number,
      rectLeft: number
  ): void {
      $gridView.find(".grid-unit:visible").each(function() {
          let grid = this;
          let $grid = $(grid);
          if ($grid.hasClass("uneditable") && $grid.hasClass("folder")
              || $grid.hasClass("noAction"))
          {
              // skip uneditable folder
              return;
          }

          let gridBound = grid.getBoundingClientRect();
          let gridTop = gridBound.top - bound.top;
          let gridLeft = gridBound.left - bound.left;
          let gridRight = gridBound.right - bound.left;
          let gridBottom = gridBound.bottom - bound.top;

          if (gridTop > rectBottom || gridLeft > rectRight ||
              gridRight < rectLeft || gridBottom < rectTop)
          {
              $grid.removeClass("selecting");
          } else {
              $grid.addClass("selecting");
          }
      });
  }

  function endDrawRect(): void {
      $gridView.removeClass("drawing");
      let $grids = $gridView.find(".grid-unit.selecting");
      if ($grids.length === 0) {
          $gridView.find(".grid-unit.selected").removeClass("selected");
      } else {
          $grids.each(function() {
              var $grid = $(this);
              $grid.removeClass("selecting")
                   .addClass("selected");
          });
      }
      focsueOnTracker();
  }

  function setupMenuActions(): void {
      let $subMenu = $("#gridViewSubMenu");
      // bg opeartion
      $gridMenu.on("mouseup", ".newFolder", function(event) {
          if (event.which !== 1) {
              return;
          }
          DS.newFolder();
      });

      $gridMenu.on("mouseup", ".back", function(event) {
          if (event.which !== 1) {
              return;
          }
          if (!$(this).hasClass("disabled")) {
              DS.upDir();
          }
      });

      $gridMenu.on("mouseup", ".refresh", function(event) {
          if (event.which !== 1) {
              return;
          }
          refreshHelper();
      });

      // folder/ds operation
      $gridMenu.on("mouseup", ".open", function(event) {
          if (event.which !== 1) {
              return;
          }
          goToDirHelper($gridMenu.data("dsid"));
      });

      $gridMenu.on("mouseup", ".moveUp", function(event) {
          if (event.which !== 1) {
              return;
          }
          var $grid = DS.getGrid($gridMenu.data("dsid"));
          DS.dropToParent($grid);
      });

      $gridMenu.on("mouseup", ".rename", function(event) {
          if (event.which !== 1) {
              return;
          }
          renameHelper(null, $gridMenu.data("dsid"));
          cleanDSSelect();
      });

      $gridMenu.on("mouseup", ".preview", function(event) {
          if (event.which !== 1) {
              return;
          }
          var $grid = DS.getGrid($gridMenu.data("dsid"));
          focusDSHelper($grid);
          cleanDSSelect();
      });

      $gridMenu.on("mouseup", ".delete", function(event) {
          if (event.which !== 1) {
              return;
          }
          var $grid = DS.getGrid($gridMenu.data("dsid"));
          DS.remove($grid);
      });

      $gridMenu.on("mouseup", ".multiDelete", function(event) {
          if (event.which !== 1) {
              return;
          }
          DS.remove($gridView.find(".grid-unit.selected"));
      });

      $gridMenu.on("mouseup", ".share", function(event) {
          if (event.which !== 1) {
              return;
          }
          if (disableShare) {
              return false;
          }
          let dsId = $gridMenu.data("dsid");
          shareDS(dsId, false);
      });

      $gridMenu.on("mouseup", ".unshare", function(event) {
          if (event.which !== 1) {
              return;
          }
          let dsId = $gridMenu.data("dsid");
          unshareDS(dsId);
      });

      $gridMenu.on("mouseup", ".getInfo", function(event) {
          if (event.which !== 1) {
              return;
          }
          DSInfoModal.Instance.show($gridMenu.data("dsid"));
      });

      $gridMenu.on("mouseup", ".activate", function(event) {
          if (event.which !== 1) {
              return;
          }
          activateDSAction([$gridMenu.data("dsid")]);
      });

      $gridMenu.on("mouseup", ".multiActivate", function(event) {
          if (event.which !== 1) {
              return;
          }
          let dsIds = [];
          $gridView.find(".grid-unit.selected.ds").each(function() {
              dsIds.push($(this).data("dsid"));
          });
          activateDSAction(dsIds);
      });

      $gridMenu.on("mouseup", ".deactivate", function(event) {
          if (event.which !== 1) {
              return;
          }
          deactivateDSAction([$gridMenu.data("dsid")]);
      });

      $gridMenu.on("mouseup", ".multiDeactivate", function(event) {
          if (event.which !== 1) {
              return;
          }
          let dsIds = [];
          $gridView.find(".grid-unit.selected.ds").each(function() {
              dsIds.push($(this).data("dsid"));
          });
          deactivateDSAction(dsIds);
      });

      $gridMenu.on("mouseenter", ".sort", function() {
          let key = sortKey || "none";
          let $lis = $subMenu.find(".sort li");
          $lis.removeClass("select");
          $lis.filter(function() {
              return $(this).attr("name") === key;
          }).addClass("select");
      });

      $subMenu.on("mouseup", ".sort li", function(event) {
          if (event.which !== 1) {
              return;
          }
          let key = $(this).attr("name");
          setSortKey(key);
      });
  }

  function setupGridMenu(): void {
      xcMenu.add($gridMenu);
      // set up click right menu
      let el: HTMLElement = <HTMLElement>$gridView.parent()[0];
      el.oncontextmenu = function(event) {
          let $target = $(event.target);
          let $grid = $target.closest(".grid-unit");
          let classes: string = " noBorder";
          let totalSelected = $gridView.find(".grid-unit.selected").length;
          if (WorkbookManager.getActiveWKBK() == null) {
              $gridMenu.find(".multiActivate, .multiDeactivate, .activate").addClass("disabled");
          } else {
              $gridMenu.find(".multiActivate, .multiDeactivate, .activate").removeClass("disabled");
          }

          if ($grid.length && totalSelected > 1) {
              // multi selection
              $gridMenu.removeData("dsid");
              classes += " multiOpts";

              $gridMenu.find(".multiActivate, .multiDeactivate").show();
              $gridMenu.find(".multiDelete").removeClass("disabled");
              let numDS = $gridView.find(".grid-unit.selected.ds").length;
              let numInActivatedDS = $gridView.find(".grid-unit.selected.inActivated").length;
              if (numDS === 0) {
                  // when no ds
                  $gridMenu.find(".multiActivate, .multiDeactivate").hide();
              } else if (numInActivatedDS === 0) {
                  // when all ds are activated
                  $gridMenu.find(".multiActivate").hide();
                  if (numDS === totalSelected) {
                      // when only have ds
                      $gridMenu.find(".multiDelete").addClass("disabled");
                  }
              } else if (numDS === numInActivatedDS) {
                  // when all ds are inactivated
                  $gridMenu.find(".multiDeactivate").hide();
              }
          } else {
              cleanDSSelect();
              $gridMenu.find(".multiActivate, .multiDeactivate").hide();
              if ($grid.length) {
                  $grid.addClass("selected");
                  let dsId = $grid.data("dsid");
                  let dsObj = DS.getDSObj(dsId);
                  if (!dsObj.isEditable()) {
                      classes += " uneditable";
                  } else if ($grid.hasClass("deleting")) {
                      // if it's deleting, also make it uneditable
                      classes += " uneditable";
                  }

                  $gridMenu.data("dsid", dsId);

                  if (dsObj.beFolder()) {
                      classes += " folderOpts";
                      if (dsObj.beFolderWithDS()) {
                          classes += " hasDS";
                      }
                  } else {
                      classes += " dsOpts";

                      if (dsObj.isActivated()) {
                          classes += " dsActivated";
                      }
                  }

                  if ($grid.hasClass("unlistable")) {
                      classes += " unlistable";

                      if ($grid.hasClass("noAction")) {
                          classes += " noAction";
                      }
                  }

                  if ($grid.hasClass("loading")) {
                      classes += " loading";
                  }

                  if (isInSharedFolder(curDirId)) {
                      classes += " sharedDir";
                      if (curDirId === DSObjTerm.SharedFolderId) {
                          classes += " sharedHomeDir";
                      }
                      if (dsObj.getUser() !== getCurrentUserName()) {
                          classes += " noUnshare";
                      }
                  }

              } else {
                  classes += " bgOpts";
                  $gridMenu.removeData("dsid");
              }
          }

          if (disableShare) {
              classes += " disableShare";
          }

          MenuHelper.dropdownOpen($target, $gridMenu, {
              "mouseCoors": {"x": event.pageX, "y": event.pageY + 10},
              "classes": classes,
              "floating": true
          });
          return false;
      };

      setupMenuActions();
  }

  function focsueOnTracker(): void {
      $dsListFocusTrakcer.focus();
  }

  function refreshHelper(): XDPromise<void> {
      let dir = curDirId;
      let deferred: XDDeferred<void> = PromiseHelper.deferred();
      let promise = DS.restore(DS.getHomeDir(true), false);
      xcUIHelper.showRefreshIcon($gridView, false, promise);

      promise
      .then(() => {
          curDirId = dir;
          refreshDS();
          commitDSChange();
          deferred.resolve();
      })
      .fail(deferred.reject);

      return deferred.promise();
  }

  function renameHelper($label: JQuery, dsId: string): void {
      if ($label == null && dsId == null) {
          return;
      }

      let $grid: JQuery;
      if ($label == null) {
          $grid = DS.getGrid($gridMenu.data("dsid"));
          $label = $grid.find("> .label");
      } else {
          $grid = $label.closest(".grid-unit");
      }

      if (dsId == null) {
          dsId = $grid.data("dsid");
      }

      let dsObj = DS.getDSObj(dsId);
      let isEditable = dsObj.isEditable();
      if (!isEditable && dsObj.beFolder()) {
          // if not editable, then should open the folder
          $grid.trigger("dblclick");
          return;
      }

      if ($label.hasClass("focused")) {
          return;
      }
      $label.addClass("focused");
      let name: string = $label.data("dsname");
      let html: HTML = '<textarea spellcheck="false">' + name + '</textarea>';
      $label.html(html).focus();

      // select all text
      let $textarea = $label.find("textarea").select();
      let textarea: HTMLElement = <HTMLElement>$textarea.get(0);
      textarea.style.height = (textarea.scrollHeight) + "px";
  }

  function goToDirHelper(dsid: string): void {
      if (dsid == null) {
          // error case
          console.error("Invalid dsid");
      }

      DS.goToDir(dsid);
      clearDirStack();
  }

  function pushDirStack(dirId: string): void {
      dirStack.push(dirId);
      $forwardFolderBtn.removeClass("xc-disabled");
  }

  function popDirStack(): void {
      if (dirStack.length <= 0) {
          // this is error case
          return;
      }

      let dirId: string = dirStack.pop();
      DS.goToDir(dirId);

      if (dirStack.length <= 0) {
          $forwardFolderBtn.addClass("xc-disabled");
      }
  }

  function clearDirStack(): void {
      dirStack = [];
      $forwardFolderBtn.addClass("xc-disabled");
  }

  function focusDSHelper($grid: JQuery): void {
      // when is deleting the ds, do nothing
      if ($grid != null &&
          !$grid.hasClass("deleting") &&
          !($grid.hasClass("unlistable") && $grid.hasClass("noAction")))
      {
          DS.focusOn($grid);
          if ($grid.hasClass("notSeen")) {
              $grid.removeClass("notSeen");
          }
      }
  }

  function getNewFolderId(): string {
      return getCurrentUserName() + "-folder-" + (new Date().getTime());
  }

  // Helper function for createDS()
  function getDSHTML(dsObj: DSObj): HTML {
      let id = dsObj.getId();
      let parentId = dsObj.getParentId();
      let name = dsObj.getName();
      let html: HTML;
      let tooltip: string = 'data-toggle="tooltip" data-container="body" data-placement="auto top"';
      let deactivateIcon: string = '<div class="deactivatingIcon xc-hidden" >' +
          '<i class="icon xi-forbid deactivating fa-15" ' +
          tooltip + 'data-title="' + DSTStr.DSDeactivating + '"></i></div>';
      if (dsObj.beFolder()) {
          // when it's a folder
          html =
          '<div class="folder grid-unit" draggable="true"' +
              ' ondragstart="DS.onDragStart(event)"' +
              ' ondragend="DS.onDragEnd(event)"' +
              ' data-dsid="' + id + '"' +
              ' data-dsparentid=' + parentId + '>' +
              '<div id="' + (id + "leftWarp") + '"' +
                  ' class="dragWrap leftTopDragWrap"' +
                  ' ondragenter="DS.onDragEnter(event)"' +
                  ' ondragover="DS.allowDrop(event)"' +
                  ' ondrop="DS.onDrop(event)">' +
              '</div>' +
              '<div  id="' + (id + "midWarp") + '"' +
                  ' class="dragWrap midDragWrap"' +
                  ' ondragenter="DS.onDragEnter(event)"' +
                  ' ondragover="DS.allowDrop(event)"' +
                  ' ondrop="DS.onDrop(event)">' +
              '</div>' +
              '<div  id="' + (id + "rightWarp") + '"' +
                  ' class="dragWrap rightBottomDragWrap"' +
                  ' ondragenter="DS.onDragEnter(event)"' +
                  ' ondragover="DS.allowDrop(event)"' +
                  ' ondrop="DS.onDrop(event)">' +
              '</div>' +
              '<i class="gridIcon icon xi-folder"></i>' +
              '<div class="dsCount">0</div>' +
              '<div title="' + name + '" class="label"' +
                  ' data-dsname="' + name + '">' +
                  name +
              '</div>' +
          '</div>';
      } else {
          let checkMarkIcon: string = '<i class="gridIcon icon xi-dataset-checkmark"></i>';
          let user = dsObj.getUser();
          let shared = isInSharedFolder(parentId);
          let title = name;
          if (shared) {
              title = name + "(" + user + ")";
          }
          // when it's a dataset
          html =
          '<div class="ds grid-unit' +
          (dsObj.isActivated() ? '' : ' inActivated') +
          (shared ? ' shared' : '') + '"' +
              ' draggable="true"' +
              ' ondragstart="DS.onDragStart(event)"' +
              ' ondragend="DS.onDragEnd(event)"' +
              ' data-user="' + user + '"' +
              ' data-dsname="' + name + '"' +
              ' data-dsid="' + id + '"' +
              ' data-dsparentid="' + parentId + '"">' +
              '<div  id="' + (id + "leftWarp") + '"' +
                  ' class="dragWrap leftTopDragWrap"' +
                  ' ondragenter="DS.onDragEnter(event)"' +
                  ' ondragover="DS.allowDrop(event)"' +
                  ' ondrop="DS.onDrop(event)">' +
              '</div>' +
              '<div id="' + (id + "rightWarp") + '"' +
                  ' class="dragWrap rightBottomDragWrap"' +
                  ' ondragenter="DS.onDragEnter(event)"' +
                  ' ondragover="DS.allowDrop(event)"' +
                  ' ondrop="DS.onDrop(event)">' +
              '</div>' +
              '<i class="gridIcon icon xi_data"></i>' +
              checkMarkIcon +
              '<div title="' + title + '" class="label"' +
                  ' data-dsname="' + name + '">' +
                  name +
              '</div>' +
              '<div class="size">' +
                  dsObj.getDisplaySize() +
              '</div>' +
              deactivateIcon +
          '</div>';
      }

      return html;
  }

  // Helper function for createDS()
  function getUneditableDSHTML(dsObj: DSObj): HTML {
      let id = dsObj.getId();
      let parentId = dsObj.getParentId();
      let name = dsObj.getName();
      let html: HTML;
      if (dsObj.beFolder()) {
          // when it's a folder
          html =
          '<div class="folder grid-unit uneditable"' +
              ' data-dsid="' + id + '"' +
              ' data-dsparentid=' + parentId + '>' +
              '<i class="gridIcon icon xi-folder"></i>' +
              '<div class="dsCount">0</div>' +
              '<div title="' + name + '" class="label"' +
                  ' data-dsname="' + name + '">' +
                  name +
              '</div>' +
          '</div>';
      } else {
          // when it's a dataset
          html =
          '<div class="ds grid-unit uneditable' +
          (dsObj.isActivated() ? '' : " inActivated") + '" ' +
              ' data-user="' + dsObj.getUser() + '"' +
              ' data-dsname="' + name + '"' +
              ' data-dsid="' + id + '"' +
              ' data-dsparentid="' + parentId + '"">' +
              '<i class="gridIcon icon xi_data"></i>' +
              '<div title="' + name + '" class="label"' +
                  ' data-dsname="' + name + '">' +
                  name +
              '</div>' +
              '<div class="size">' +
                  dsObj.getDisplaySize() +
              '</div>' +
          '</div>';
      }

      return html;
  }

  function cleanDSSelect(): void {
      $gridView.find(".selected").removeClass("selected");
  }

  function activateDSAction(dsIds: string[]): void {
      Alert.show({
          title: DSTStr.ActivateDS,
          msg: DSTStr.ActivateDSMsg,
          onConfirm: function() {
              activateDS(dsIds, false);
          }
      });
  }

  function activateDS(dsIds: string[], noAlert: boolean, txId?: number): XDPromise<void> {
      let deferred: XDDeferred<void> = PromiseHelper.deferred();
      let failures: string[] = [];
      let datasets: string[] = [];
      let dirId: string = curDirId;
      let promises = dsIds.map((dsId) => {
          return activateOneDSHelper(dsId, failures, datasets, noAlert, txId);
      });

      PromiseHelper.when(...promises)
      .then(() => {
          if (failures.length && !noAlert) {
              Alert.show({
                  "title": AlertTStr.Error,
                  "msg": failures.join("\n"),
                  "isAlert": true,
                  "onCancel": focsueOnTracker
              });
          }

          if (datasets.length) {
              changeDSInfo(dirId, {
                  action: "activate",
                  dsIds: dsIds
              });
          }
          deferred.resolve();
      })
      .fail(deferred.reject);

      return deferred.promise();
  }

  function activateOneDSHelper(
      dsId: string,
      failures: string[],
      datasets: string[],
      noAlert: boolean,
      txId?: number
  ): XDPromise<void> {
      let deferred: XDDeferred<void> = PromiseHelper.deferred();
      let dsObj = DS.getDSObj(dsId);
      if (dsObj == null || dsObj.beFolder()) {
          return PromiseHelper.resolve();
      }
      if (txId == null) {
          txId = noAlert ? null : Transaction.start({
              "operation": SQLOps.DSImport,
              "track": true,
              "steps": 1
          });
      }
      let $grid = DS.getGrid(dsObj.getId());
      if (!noAlert) {
          $grid.data("txid", txId);
          $grid.addClass("loading");
      }

      let datasetName = dsObj.getFullName();
      activateHelper(txId, dsObj)
      .then(() => {
          return DS.getDSBasicInfo(datasetName);
      })
      .then((dsMeta) => {
          updateDSMetaHelper(dsMeta[datasetName], dsObj);
          datasets.push(dsId);
          if (txId != null) {
              Transaction.done(txId, {});
          }
          // clear error
          dsObj.setError(undefined);
          deferred.resolve();
      })
      .fail((error) => {
          try {
              let displayError = error.error || error.log;
              let errorMsg = xcStringHelper.replaceMsg(DSTStr.FailActivateDS, {
                  "ds": dsObj.getName(),
                  "error": displayError
              });
              failures.push(errorMsg);

              if (typeof error === "object" &&
                  error.status === StatusT.StatusCanceled)
              {
                  if ($grid.hasClass("active")) {
                      focusOnForm();
                  }
              } else if (!noAlert) {
                  handleImportError(dsObj, displayError, true);
              }

              if (txId != null) {
                  Transaction.fail(txId, {
                      error: error,
                      noAlert: true
                  });
              }
          } catch (e) {
              console.error(e);
          }
          // need to remove ahead of time to ensure consistent isLoading behavior
          $grid.removeClass("loading");
          deferred.resolve(); // still resolve it
      })
      .always(() => {
          finishActivate($grid);
          loadCleanup();
      });

      return deferred.promise();
  }

  function activateHelper(txId: number, dsObj: DSObj): XDPromise<void> {
      let deferred: XDDeferred<void> = PromiseHelper.deferred();
      let datasetName = dsObj.getFullName();

      XcalarDatasetActivate(datasetName, txId)
      .then(() => {
          activateDSObj(dsObj);
          deferred.resolve();
      })
      .fail((error) => {
          if (error && error.status === StatusT.StatusDatasetNameAlreadyExists) {
              // this error usually mean dataset is already active
              XcalarGetDatasetsInfo(datasetName)
              .then(() => {
                  // if XcalarGetDatasetsInfo works, then dataset is activated
                  activateDSObj(dsObj);
                  deferred.resolve();
              })
              .fail(() => {
                  deferred.reject(error);
              });
          } else {
              deferred.reject(error);
          }
      });

      return deferred.promise();
  }

  function activateDSObj(dsObj: DSObj): void {
      dsObj.activate();
      DS.getGrid(dsObj.getId()).removeClass("inActivated loading");
      let dsId = dsObj.getId();
      let $grid = DS.getGrid(dsId);
      if ($grid.hasClass("active")) {
          // re-focus on the dataset
          $grid.removeClass("active");
          DS.focusOn($grid);
      }
  }

  function deactivateDSAction(dsIds: string[]): void {
      Alert.show({
          title: DSTStr.DeactivateDS,
          msg: DSTStr.DeactivateDSMsg,
          onConfirm: () => {
              deactivateDS(dsIds);
          }
      });
  }

  function deactivateDS(dsIds: string[]): XDPromise<void> {
      let deferred: XDDeferred<void> = PromiseHelper.deferred();
      let failures: string[] = [];
      let datasets: string[] = [];
      let dsInUse: string[] = [];
      let dirId: string = curDirId;
      let promises = dsIds.map((dsId) => {
          return deactivateOneDSHelper(dsId, failures, datasets, dsInUse);
      });

      PromiseHelper.when(...promises)
      .then(() => {
          if (failures.length) {
              Alert.show({
                  "title": AlertTStr.Error,
                  "instr": (dsInUse.length) ? DSTStr.InUseInstr : null,
                  "msg": failures.join("\n"),
                  "isAlert": true,
                  "onCancel": focsueOnTracker
              });
          }
          if (datasets.length) {
              changeDSInfo(dirId, {
                  action: "deactivate",
                  dsIds: dsIds
              });
          }
          deferred.resolve();
      })
      .fail(deferred.reject);

      return deferred.promise();
  }

  function deactivateOneDSHelper(
      dsId: string,
      failures: string[],
      datasets: string[],
      dsInUse: string[]
  ): XDPromise<void> {
      let deferred: XDDeferred<void> = PromiseHelper.deferred();
      var dsObj = DS.getDSObj(dsId);
      if (dsObj.beFolder()) {
          return PromiseHelper.resolve();
      }

      let $grid = DS.getGrid(dsId);
      $grid.find(".deactivatingIcon").removeClass("xc-hidden");
      let fullDSName = dsObj.getFullName();

      clearLoadNodeInAllWorkbooks(fullDSName)
      .then(() => {
          return checkDSUser(fullDSName);
      })
      .then(() => {
          return XcalarDatasetDeactivate(fullDSName);
      })
      .then(() => {
          datasets.push(dsId);
          deactivateDSObj(dsId);
          deferred.resolve();
      })
      .fail((error) => {
          // XXX TODO: use the correct status
          if (error.status === StatusT.StatusDsDatasetInUse) {
              dsInUse.push(dsId);
          }
          let errorMsg = xcStringHelper.replaceMsg(DSTStr.FailDeactivateDS, {
              "ds": dsObj.getName(),
              "error": error.error
          });
          failures.push(errorMsg);
          // still resolve it
          deferred.resolve();
      })
      .always(() => {
          $grid.find(".deactivatingIcon").addClass("xc-hidden");
      });

      return deferred.promise();
  }

  function deactivateDSObj(dsId: string): void {
      let dsObj = DS.getDSObj(dsId);
      if (dsObj == null) {
          // when it's not in
          return;
      }
      let $grid = DS.getGrid(dsId);
      dsObj.deactivate();
      $grid.addClass("inActivated");
  }

  function deleteTempDS(dsName: string): void {
      XcalarDatasetDelete(dsName)
      .fail(() => {
          try {
              clearLoadNodeInAllWorkbooks(dsName)
              .always(() => {
                  XcalarDatasetDelete(dsName);
              });
          } catch (e) {
              console.error(e);
          }
      });
  }

  // XXX TODO: this is a try to remove all the load nodes
  // across a user's all workbooks,
  // but finally backend should remove the load node and
  // we should not use this workaround
  function clearLoadNodeInAllWorkbooks(datasetName: string): XDPromise<void> {
      let clearLoadNodeHelper = function(dsName, wkbkName) {
          let deferred: XDDeferred<void> = PromiseHelper.deferred();
          XcalarDatasetDeleteLoadNode(dsName, wkbkName)
          .then(deferred.resolve)
          .fail((error) => {
              if (error.status === StatusT.StatusDsDatasetInUse) {
                  let msg = xcStringHelper.replaceMsg(DSTStr.InUseErr, {
                      name: wkbkName
                  });
                  error.error = msg
              }
              deferred.reject(error);
          });

          return deferred.promise();
      }
      let workbooks = WorkbookManager.getWorkbooks();
      let promises = [];
      for (let id in workbooks) {
          let wkbk = workbooks[id];
          if (wkbk.hasResource()) {
              // when it's active workbook
              promises.push(clearLoadNodeHelper.bind(this, datasetName, wkbk.getName()));
          }
      }
      return PromiseHelper.chain(promises);
  }

  function getCurrentUserName(): string {
      return XcUser.getCurrentUserName();
  }

  /*** Drag and Drop API ***/
  /**
   * DS.onDragStart
   * Helper function for drag start event
   */
  export function onDragStart(event) {
      let $grid = $(event.target).closest(".grid-unit");

      event.stopPropagation();
      event.dataTransfer.effectAllowed = "move";
      // must add datatransfer to support firefox drag drop
      event.dataTransfer.setData("text", "");

      setDragDS($grid);
      resetDropTarget();

      $grid.find("> .dragWrap").addClass("xc-hidden");
      $gridView.addClass("drag");
      $gridView.find(".grid-unit.active").removeClass("active");

      // when enter extra space in grid view
      $gridView.on("dragenter", function(){
          resetDropTarget();
      });
  }

  /**
   * DS.onDragEnd
   * Helper function for drag end event
   */
  export function onDragEnd(event) {
      let $grid = $(event.target).closest(".grid-unit");

      event.stopPropagation();

      // clearence
      $grid.find("> .dragWrap").removeClass("xc-hidden");
      resetDropTarget();
      resetDragDS();

      $gridView.find(".entering").removeClass("entering");
      $gridView.removeClass("drag");
      $gridView.off("dragenter");
  }

  /**
   * DS.onDragEnter
   * Helper function for drag enter event
   * @param event
   */
  export function onDragEnter(event) {
      let $dragWrap = $(event.target);
      let targetId: string = $dragWrap.attr("id");
      let $curDropTarget = getDropTarget();

      event.preventDefault();
      event.stopPropagation();

      // back up button
      if (!$curDropTarget || targetId !== $curDropTarget.attr("id")) {
          // change drop target
          $(".grid-unit.entering").removeClass("entering");
          $(".dragWrap").removeClass("active");

          if ($dragWrap.hasClass("midDragWrap")) {
              // drop in folder case
              $dragWrap.closest(".grid-unit").addClass("entering");
          } else if (!isInSharedFolder(curDirId)) {
              // insert case
              $dragWrap.addClass("active");
          }

          setDropTraget($dragWrap);
      }
  }

  /**
   * DS.allowDrop
   * Helper function for drag over event
   * @param event
   */
  export function allowDrop(event) {
      // call the event.preventDefault() method for
      // the ondragover allows a drop
      event.preventDefault();
  }

  /**
   * DS.onDrop
   * Helper function for drop event
   * @param event
   */
  export function onDrop(event) {
      let $div = getDropTarget();
      let $target = $div.closest('.grid-unit');
      let $grid = getDragDS();

      event.stopPropagation();

      if ($div != null) {
          if ($div.hasClass('midDragWrap')) {
              DS.dropToFolder($grid, $target);
          } else if ($div.hasClass('leftTopDragWrap')) {
              DS.insert($grid, $target, true);
          } else {
              DS.insert($grid, $target, false);
          }
          let $labels = $gridView.find(".label:visible");
          DataSourceManager.truncateLabelName($labels);
      }
  }

  /**
   * DS.dropToFolder
   * Helper function to drop ds into a folder
   */
  export function dropToFolder($grid: JQuery, $target: JQuery): void {
      let dsId: string = $grid.data("dsid");
      let targetId: string = $target.data("dsid");
      let hasMoved = dropHelper(dsId, targetId);

      if (hasMoved) {
          refreshDS();
          changeDSInfo(targetId, {
              action: "drop",
              dsId: dsId,
              targetId: targetId
          });
      }
  }

  /**
   * DS.insert
   * Helper function to insert ds before or after another ds
   * @param $grid
   * @param $sibling
   * @param isBefore
   */
  export function insert(
      $grid: JQuery,
      $sibling: JQuery,
      isBefore: boolean
  ): void {
      if (sortKey != null) {
          // cannot change order when has sort key
          return;
      } else if (isInSharedFolder(curDirId)) {
          // shared folder don't allow insert
          return;
      }
      let dragDsId: string = $grid.data("dsid");
      let ds = DS.getDSObj(dragDsId);

      let siblingId: string = $sibling.attr("data-dsid");
      if (dragDsId === siblingId) {
          return;
      }
      let siblingDs = DS.getDSObj(siblingId);

      // parent
      let parentId: string = siblingDs.parentId;
      let parentDs = DS.getDSObj(parentId);

      let insertIndex: number = parentDs.eles.indexOf(siblingDs);
      let isMoveTo: boolean;

      if (isBefore) {
          isMoveTo = ds.moveTo(parentDs, insertIndex);
      } else {
          isMoveTo = ds.moveTo(parentDs, insertIndex + 1);
      }

      if (isMoveTo) {
          $grid.attr("data-dsparentid", parentId)
              .data("dsparentid", parentId);
          if (isBefore) {
              $sibling.before($grid);
          } else {
              $sibling.after($grid);
          }
          refreshDS();
          commitDSChange();
      }
  }

  /**
   * DS.dropToParent
   */
  export function dropToParent($grid: JQuery): void {
      let dsId: string = $grid.data("dsid");
      let ds = DS.getDSObj(dsId);
      // target
      let grandPaId: string = DS.getDSObj(ds.parentId).parentId;
      let hasMoved = dropHelper(dsId, grandPaId);

      if (hasMoved) {
          refreshDS();
          changeDSInfo(grandPaId, {
              action: "drop",
              dsId: dsId,
              targetId: grandPaId
          });
      }
  }

  function dropHelper(dsId: string, targetId: string): boolean {
      let ds = DS.getDSObj(dsId);
      let targetDS = DS.getDSObj(targetId);
      if (dsId === targetId || ds == null || targetDS == null) {
          return false;
      }
      let $grid = DS.getGrid(dsId);
      if (ds.moveTo(targetDS, -1)) {
          $grid.attr("data-dsparentid", targetId)
                  .data("dsparentid", targetId);
          return true;
      }
      return false;
  }

  // Get current dataset/folder in drag
  function getDragDS(): JQuery {
      return $dragDS;
  }

  // Set current dataset/folder in drag
  function setDragDS($ds: JQuery): void {
      $dragDS = $ds;
  }

  // Reset drag dataset/folder
  function resetDragDS(): void {
      $dragDS = undefined;
  }

  // Get drop target
  function getDropTarget(): JQuery {
      return $dropTarget;
  }

  // Set drop target
  function setDropTraget($target: JQuery): void {
      $dropTarget = $target;
  }

  // Reset drop target
  function resetDropTarget(): void {
      $dropTarget = undefined;
  }

  /* End of Drag and Drop API */

  /* Unit Test Only */
  export let __testOnly__: any = {};
  if (typeof window !== 'undefined' && window['unitTestMode']) {
      __testOnly__ = {};
      __testOnly__.delDSHelper = delDSHelper;
      __testOnly__.createDS = createDS;
      __testOnly__.removeDS = removeDS;
      __testOnly__.cacheErrorDS = cacheErrorDS;
      __testOnly__.checkUnlistableDS = checkUnlistableDS;

      __testOnly__.getDragDS = getDragDS;
      __testOnly__.setDragDS = setDragDS;
      __testOnly__.resetDragDS = resetDragDS;
      __testOnly__.getDropTarget = getDropTarget;
      __testOnly__.setDropTraget = setDropTraget;
      __testOnly__.resetDropTarget = resetDropTarget;
      __testOnly__.activateDS = activateDS;
      __testOnly__.deactivateDS = deactivateDS;
      __testOnly__.setSortKey = setSortKey;
      __testOnly__.getSortKey = function() {
          return sortKey;
      };
      __testOnly__.shareDS = shareDS;
      __testOnly__.unshareDS = unshareDS;
      __testOnly__.shareAndUnshareHelper = shareAndUnshareHelper;
      __testOnly__.alertSampleSizeLimit = alertSampleSizeLimit;
  }
  /* End Of Unit Test Only */
}
