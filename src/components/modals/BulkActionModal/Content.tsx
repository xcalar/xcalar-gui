import * as React from "react";
import dict from "../../../lang";
import Checkbox from "../../widgets/Checkbox";
import { Item } from ".";
import Row from "./Row";
import Title from "./Title";

const { CommonTStr } = dict;

type Props = {
  id: string;
  items: Item[];
  noSize: boolean;
  noDate: boolean
  sortKey: string;
  onSelectAll: Function;
  onSelect: Function;
  onSort;
};

const Content = (props: Props) => {
  const {
    id, items, noSize, noDate, sortKey,
    onSelect, onSelectAll, onSort
  } = props;
  let selectAll: boolean = true;
  let checked: boolean = false;
  let selectedItems = items.filter((item) => item.checked);
  let unlockedItems = items.filter((item) => !item.locked);
  if (selectedItems.length == unlockedItems.length && unlockedItems.length > 0) {
    checked = true;
    selectAll = false;
  }

  let titles = [{
    name: "name",
    text: CommonTStr.Name
  }];
  if (!noSize) {
    titles.push({
      name: "size",
      text: CommonTStr.Size,
    });
  }
  if (!noDate) {
    titles.push({
      name: "date",
      text: CommonTStr.DateModified
    });
  }
  return (
    <section className="section">
      <div className="titleSection">
        <Checkbox
          checked={checked}
          onClick={() => onSelectAll(selectAll)}
        />
        {titles.map((title) => {
          let classNames = [];
          let {name, text} = title;
          if (name === "name") {
              classNames.push("name");
          }
          if (name === sortKey) {
              classNames.push("active");
          }
          return (
            <Title
              name={name}
              className={classNames.join(" ")}
              onSort={onSort}
            >
              {text}
            </Title>
          )
        })}
      </div>
      <div className="listSection">
        <ul>
        {items.map((item, i) => (
          <Row
            id={id}
            item={item}
            noSize={noSize}
            noDate={noDate}
            onClick={() => onSelect(i)}
          />
        ))}
        </ul>
      </div>
    </section>
  )
};

export default Content;