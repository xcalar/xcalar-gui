import * as React from "react";
import dict from "../../lang";
import BulkActionModal, { Item } from "./BulkActionModal";
import service from "../../services/DFService";

const { DeleteModulesTStr } = dict;

class DeleteModuleModal extends React.Component<{}, {}> {
  render() {
    return (
      <BulkActionModal
        id="deleteModuleModal"
        triggerButton="deleteModuleButton"
        header={DeleteModulesTStr.header}
        fetchList={this._fetch}
        noSize={true}
        getConfirmAlert={this._getConfirmAlert}
        onSubmit={this._handleSubmit}
        onError={this._handleDeleteError}
      />
    )
  }

  private async _fetch(): Promise<Item[]> {
    let modules = await service.listModules();
    let items = modules.map(({ id, name, createdTime }) => {
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
      title: DeleteModulesTStr.header,
      msg: DeleteModulesTStr.confirm
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
    Alert.error(DeleteModulesTStr.Error, error, {highZindex: true});
  }
}

export default DeleteModuleModal;