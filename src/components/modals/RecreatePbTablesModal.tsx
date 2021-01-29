import * as React from "react";
import dict from "../../lang";
import BulkActionModal, { Item } from "./BulkActionModal";
import service from "../../services/PbTableService";

const { ReceateTablesModalTStr } = dict;

class RecreatePbTablesModal extends React.Component<{}, {}> {
  render() {
    return (
      <BulkActionModal
        id={"activatePbTablesModal"} 
        triggerButton={"activatePbTableButton"}
        header={ReceateTablesModalTStr.header}
        instruct={ReceateTablesModalTStr.instr}
        fetchList={this._fetch}
        getConfirmAlert={this._getConfirmAlert}
        onSubmit={this._handleSubmit}
        noSize
        noDate
        closeOnSubmit
      />
    )
  }

  private async _fetch(): Promise<Item[]> {
    const pbTables = await service.listDeactivatedTables();
    let items = pbTables.map((pbTable) => {
      let { name } = pbTable;
      return {
        id: name,
        name,
        locked: false,
        checked: false,
        size: null,
        date: null
      }
    });
    return items;
  }

  private _getConfirmAlert(items: Item[]): {title: string, msg: string} {
    const xcStringHelper = window["xcStringHelper"];
    const tables: string[] = items.map((item) => item.name);
    const selection = tables.length > 1
    ? xcStringHelper.replaceMsg(ReceateTablesModalTStr.multipleSection, { num: tables.length })
    : ReceateTablesModalTStr.oneSelection
    const msg = `${ReceateTablesModalTStr.confirm} (${selection})`;
    return {
      title: ReceateTablesModalTStr.header,
      msg
    };
  }

  private _handleSubmit(items: Item[]): Promise<void> {
    const tables: string[] = items.map((item) => item.name);
    return service.activate(tables);
  }
}

export default RecreatePbTablesModal;