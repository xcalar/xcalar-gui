import * as React from "react";
import dict from "../../lang";
import BulkActionModal, { Item } from "./BulkActionModal";
import service from "../../services/PbTableService";

const { DeletePbTableModalTStr } = dict;

class DeletePbTableModal extends React.Component<{}, {}> {
  render() {
    return (
      <BulkActionModal
        id={"deletePbTableModal"} 
        triggerButton={"deletePbTableButton"}
        header={DeletePbTableModalTStr.header}
        instruct={DeletePbTableModalTStr.instr}
        fetchList={this._fetch}
        getConfirmAlert={this._getConfirmAlert}
        onSubmit={this._handleSubmit}
      />
    )
  }

  private async _fetch(): Promise<Item[]> {
    let pbTables = await service.list();
    let items = pbTables.map((pbTable) => {
      let { name, size, createTime } = pbTable;
      return {
        "id": name,
        "name": name,
        "size": size,
        "locked": false,
        "checked": false,
        "date": createTime ? createTime * 1000 : null,
      }
    });
    return items;
  }

  private _getConfirmAlert(): {title: string, msg: string} {
    const xcStringHelper = window["xcStringHelper"];
    let msg = xcStringHelper.replaceMsg(DeletePbTableModalTStr.confirm);
    return {
      title: DeletePbTableModalTStr.header,
      msg
    };
  }

  private _handleSubmit(items: Item[]): Promise<void> {
    let tables: string[] = items.map((item) => item.name);
    return service.delete(tables);
  }
}

export default DeletePbTableModal;