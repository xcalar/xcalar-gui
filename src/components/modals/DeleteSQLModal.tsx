import * as React from "react";
import dict from "../../lang";
import BulkActionModal, { Item } from "./BulkActionModal";
import service from "../../services/SQLService";

const { DeleteSQLModalTStr } = dict;

class DeleteSQLModal extends React.Component<{}, {}> {
  render() {
    return (
      <BulkActionModal
        id="deleteSQLModal"
        triggerButton="deleteSQLButton"
        header={DeleteSQLModalTStr.header}
        fetchList={this._fetch}
        noSize={true}
        noDate={true}
        getConfirmAlert={this._getConfirmAlert}
        onSubmit={this._handleSubmit}
      />
    )
  }

  private async _fetch(): Promise<Item[]> {
    let snippets = await service.list();
    let items = [];
    snippets.forEach((snippet) => {
      let { id, name } = snippet;
      if (!service.hasUnsavedId(snippet)) {
        items.push({
            id,
            name,
            size: null,
            date: null,
            locked: false,
            checked: false
          });
      }
    });
    return items;
  }

  private _getConfirmAlert(): {title: string, msg: string} {
    return {
      title: DeleteSQLModalTStr.header,
      msg: DeleteSQLModalTStr.confirm
    };
  }

  private _handleSubmit(items: Item[]): Promise<void> {
    let ids = items.map((item) => item.id);
    return service.delete(ids);
  }
}

export default DeleteSQLModal;