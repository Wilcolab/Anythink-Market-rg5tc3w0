import ItemPreview from "./ItemPreview";
import ListPagination from "./ListPagination";
import React, {useEffect, useState} from "react";

const ItemList = (props) => {

  const [listItems, setListItems] = useState(props.items);

  useEffect(() => {
    if(props.searchValue.length > 2){
      setListItems(props.items.filter(item => item.title.toLowerCase().includes(props.searchValue.toLowerCase())))
    }
    else{
      setListItems(props.items)
    }
  }, [props.searchValue])


  if (!props.items) {
    return <div className="py-4">Loading...</div>;
  }

  if (props.items.length === 0) {
    return <div className="py-4 no-items">No items are here... yet.</div>;
  }

  return (
    <div className="container py-2">
      <div className="row">

        {
          listItems?.map((item) => {
            return (
              <div className="col-sm-4 pb-2" key={item.slug}>
                <ItemPreview item={item} />
              </div>
            );
          })
        } 
        {props.items.length > 0 && listItems?.length === 0 &&
        <div id="empty">
        No items found for "{props.searchValue}"
        </div>
        }
      </div>

      <ListPagination
        pager={props.pager}
        itemsCount={props.itemsCount}
        currentPage={props.currentPage}
      />
    </div>
  );
};

export default ItemList;
