/**
 * orderシートの注文データのうち、チェックをつけたデータを、freeeシートに転記する関数
 */
function copyOrderToFreeSheet() {

  const oS = ORDER_SHEET_SETTINGS;
  const pS = PARTNERS_SHEET_SETTINGS;

  // orderシートのデータを一旦全て取得
  const values = orderSheet.getDataRange().getValues();
  const lastRowOs = values.length;  // 行数(=最終行番号) ※indexではない!!
  const lastCol = values[0].length;  // 列数（=ヘッダー行の列数を取得）

  let cntData = 0;  // コピー完了した注文データのカウンター

  // orderシートの各メニュー列におけるヘッダー行（1〜4行目）の値を事前にキャッシュしておく
  let menuH = [];  // "要素追加"による変更が生じるため、letで宣言
  for (let j = oS.menuStartCol - 1; j < lastCol; j++) {
    const item = values[1][j];  // 「品目名」を取得
    const unit = values[2][j];  // 「単位(Unit)」を取得
    const amount = values[3][j]; // 「内容量」を取得
    const price = values[4][j];  // 「単価」を取得

    menuH.push({item, amount, unit, price});
  }

  // orderシートの各行について処理
  for (let i = oS.contStartRow; i < lastRowOs; i++) {  // 実際の注文データ行からループをスタート
    if (!values[i][0]) continue;  // チェックボックスにチェックがなければスキップ
    
    const row = values[i];  // 行データ(注文データ)を変数に格納
    console.log(`注文データID: ${row[2]}`);

    // 行データ転記前に、freeeシートの最終行を取得しておく
    const lastRowFs = freeeSheet.getLastRow();

    // 転記データ格納用 ("要素追加"による変更が生じるため、letで宣言)
    let copiedData = [""];  // 最初の要素にはチェックボックスを挿入するため、空白文字列で確保

    copiedData.push(row[oS.acptDateCol - 1]);  // 受付日をpush
    copiedData.push(row[oS.orderIdCol - 1]);  // 注文IDをpush
    copiedData.push(row[oS.deliDateCol - 1]);  // 納品日をpush
    copiedData.push(row[oS.shopNameCol - 1]);  // 名前をpush

    // 空白文字列を挿入 (freee取引先, 取引先IDをセットするための列を確保)
    copiedData.push("", "");

    let menuArr = [];  // メニュー項目のオブジェクトを１つにまとめるための配列 ("要素追加"による変更が生じるため、letで宣言)
    // orderシートのメニュー列における処理
    for (let j = oS.menuStartCol - 1; j < lastCol; j++) {
      // セル（row[j]）に値があるときに処理を行う
      if (row[j] !== "") {
        const { item, amount, unit, price } = menuH[j - (oS.menuStartCol - 1)];
        const quantity = row[j];  // row行の「注文数」を取得

        const itemData = {
          "item": item,
          "amount": amount,
          "unit": unit,
          "price": price,
          "quantity": quantity
        };
        menuArr.push(itemData);
      }
    }
    console.log(menuArr);
    console.log(JSON.stringify(menuArr));
    copiedData.push(JSON.stringify(menuArr));  // JSON文字列に変換してpush


    // freeeシートに行を追加して転記
    freeeSheet.getRange(lastRowFs + 1, 1, 1, copiedData.length).setValues([copiedData]); // fS.acptDateColから6列分の範囲にcopiedDataを転記
    freeeSheet.getRange(lastRowFs + 1, 1).insertCheckboxes();  // 1列目にチェックボックスをセット

    cntData++;  // コピー完了したらカウントアップ
  }

  // // コピーが完了した行をorderシートから削除
  // if (copiedRows.length > 0) {
  //   // point: インデックスが小さい順に削除すると、後続の行のインデックスが変わり、当初保存したインデックスの位置とズレる
  //   // したがって、もっとも下の行のデータ(大きいインデックスを持つ行データ）から削除していく
  //   copiedRows.reverce().forEach(idx => {
  //     orderSheet.deleteRow(idx + 1);  // 行番号は１から始まるため「+1」
  //   })
  // }

  if (cntData > 0) {
    // setPulldowns(pS);  // // プルダウンを設定
    showDialog("成功", `コピー完了した注文データ数 : ${cntData}`);   
  } else {
    showDialog("Error", "チェックされた項目が見つかりません。\nコピーしたい注文データにチェックをつけてください。");
  }
}



/**
 * 行データがセットされたタイミングで、「freee（取引先名）」 列にプルダウンをセットする関数
 */
function setPulldowns() {
  const pS = PARTNERS_SHEET_SETTINGS;
  // 「取引先名」列における最終行を取得
  const lastRowPartnerName = partnerSheet.getRange(partnerSheet.getMaxRows(), pS.nameCol).getNextDataCell(SpreadsheetApp.Direction.UP).getRow();
  const nameListRange = partnerSheet.getRange(pS.contStartRow, pS.nameCol, lastRowPartnerName, 1);
  const nameList = nameListRange.getValues().flat().filter(String);
  console.log(nameList);

  // プルダウンの入力規制を定義 (第二引数のtrueは、無効な入力を許可しないの意)
  const pdRule = SpreadsheetApp.newDataValidation().requireValueInList(nameList, true).build();
  console.log(pdRule);

  // freeeシートの最終行を取得し、列にプルダウンをセット
  const lastRowFreeeSt = freeeSheet.getLastRow();
  console.log(lastRowFreeeSt);
  const pdRange = freeeSheet.getRange(fS.contStartRow, fS.partnerNameCol, lastRowFreeeSt - fS.contStartRow + 1, 1);
  pdRange.setDataValidation(pdRule);
}


