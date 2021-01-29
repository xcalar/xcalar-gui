import * as React from "react";
import dict from "../../lang";
import BulkActionModal, { Item } from "./BulkActionModal";
import service from "../../services/DFService";

const { DeleteTableFuncTStr } = dict;

class DeleteTableFuncModal extends React.Component<{}, {}> {
  render() {
    return (
      <BulkActionModal
        id="deleteTableFuncModal"
        triggerButton="deleteTableFuncButton"
        header={DeleteTableFuncTStr.header}
        fetchList={this._fetch}
        noSize={true}
        getConfirmAlert={this._getConfirmAlert}
        onSubmit={this._handleSubmit}
        onError={this._handleDeleteError}
      />
    )
  }

  private async _fetch(): Promise<Item[]> {
    let tableFuncs = await service.listTableFuncs();
    let items = tableFuncs.map(({ id, name, createdTime }) => {
      return {
        id,
        name,
        size: null,
        date: createdTime,
        locked: false,
        checked: false
      }
    });
    return items;
  }

  private _getConfirmAlert(): {title: string, msg: string} {
    return {
      title: DeleteTableFuncTStr.header,
      msg: DeleteTableFuncTStr.confirm
    };
  }

  private async _handleSubmit(
    items: Item[]
  ): Promise<{id: string, error: string}[]> {
    let ids = items.map((item) => item.id);
    return service.deleteByIds(ids);
  }

  private _handleDeleteError(error: string): void {
    let Alert = window["Alert"];
    Alert.error(DeleteTableFuncTStr.Error, error, {highZindex: true});
  }
}

export default DeleteTableFuncModal;