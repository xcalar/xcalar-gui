import * as React from "react";
import dict from "../../lang";
import BulkActionModal, { Item } from "./BulkActionModal";
import service from "../../services/TableService";

const { DeleteTableModalTStr } = dict;
const id: string = "deleteTableModal";

class DeleteTableModal extends React.Component<{}, {}> {
  render() {
    return (
      <BulkActionModal
        id={id} 
        triggerButton={"monitor-delete"}
        header={DeleteTableModalTStr.header}
        instruct={DeleteTableModalTStr.instr}
        fetchList={this._fetch}
        noDate={true}
        getConfirmAlert={this._getConfirmAlert}
        onSubmit={this._handleSubmit}
      />
    )
  }

  private async _fetch(): Promise<Item[]> {
    let DagTblManager = window["DagTblManager"];
    let tables = await service.list();
    let items = tables.map((table) => {
      let tableName = table.name;
      return {
        "id": table.dagNodeId,
        "name": tableName,
        "size": table.size,
        "locked": DagTblManager.Instance.isPinned(tableName) || table.pinned,
        "checked": false,
        "date": null
      }
    });
    return items;
  }

  private _getConfirmAlert(): {title: string, msg: string} {
    return {
        title: DeleteTableModalTStr.header,
        msg: DeleteTableModalTStr.confirm
    };
  }

  private _handleSubmit(items: Item[]): Promise<void> {
    let tables = items.map((item) => item.name);
    return service.deleteTables(tables, id);
  }
}

export default DeleteTableModal;