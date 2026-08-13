const Airtable = require('airtable');
require('dotenv').config();


const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const scriptsTable = base(process.env.AIRTABLE_TABLE_NAME2)
module.exports = {
    // teamsTable: base(process.env.AIRTABLE_TABLE_NAME),
    // scriptsTable: base(process.env.AIRTABLE_TABLE_NAME2),
    scriptsTable
  };