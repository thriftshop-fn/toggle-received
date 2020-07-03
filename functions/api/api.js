if (!process.env.NETLIFY) {
  require("dotenv").config();
}

const { GoogleSpreadsheet } = require("google-spreadsheet");

const {
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY,
  GOOGLE_SPREADSHEET_ID_FROM_URL,
} = process.env;

if (!GOOGLE_SERVICE_ACCOUNT_EMAIL)
  throw new Error("no GOOGLE_SERVICE_ACCOUNT_EMAIL env var set");
if (!GOOGLE_PRIVATE_KEY) throw new Error("no GOOGLE_PRIVATE_KEY env var set");
if (!GOOGLE_SPREADSHEET_ID_FROM_URL)
  throw new Error("no GOOGLE_SPREADSHEET_ID_FROM_URL env var set");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
      headers: { Allow: "POST" },
    };
  }

  const { reference_no = null } = JSON.parse(event.body);

  if (!reference_no) {
    let error = {
      statusCode: 422,
      body: "Reference is Required!",
    };
    return error;
  }

  try {
    const doc = new GoogleSpreadsheet(GOOGLE_SPREADSHEET_ID_FROM_URL);
    await doc.useServiceAccountAuth({
      client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    });
    await doc.loadInfo();

    const purchase_sheet = doc.sheetsById[1];

    const rows = await purchase_sheet.getRows();
    const rowIndex = rows.findIndex((x) => x.reference_no == reference_no);

    if (rowIndex == -1) {
      let error = {
        statusCode: 404,
        body: "Reference Number Not Found!",
      };
      return error;
    }
    if (rows[rowIndex].received == "no" || rows[rowIndex].received == false) {
      rows[rowIndex].received = "yes";
    } else {
      rows[rowIndex].received = "no";
    }

    var isReceived = "Order Has Been Mark As Not Yet Received";

    if (rows[rowIndex].received == "yes") {
      isReceived = "Order Has Been Mark As Received";
    }

    await rows[rowIndex].save();

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `${isReceived}`,
      }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: e.toString(),
    };
  }
};
