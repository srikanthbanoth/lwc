import { LightningElement,api } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import { updateRecord } from 'lightning/uiRecordApi';
/*Read the excel uploaded data*/
import sheet from '@salesforce/resourceUrl/sheet';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import ID_FIELD from '@salesforce/schema/Quote.Id';
import custproducts from '@salesforce/schema/Quote.custproducts__c';

let XLS = {};
export default class Fecthdata extends LightningElement {
    @api recordId;
    parsedData;
    strAcceptedFormats = ['.xls', '.xlsx'];
    strUploadFileName; //Store the name of the selected file.
    objExcelToJSON; //Javascript object to store the content of the file
    connectedCallback() {
    Promise.all([loadScript(this, sheet)])
      .then(() => {
        XLS = XLSX;
      })
      .catch((error) => {
        console.log('An error occurred while processing the file'+error);
      });

  }

  handleUploadFinished(event) {
    const strUploadedFile = event.detail.files;
    if (strUploadedFile.length && strUploadedFile !== "") {
      this.strUploadFileName = strUploadedFile[0].name;
      this.handleProcessExcelFile(strUploadedFile[0]);
    }
  }

  handleProcessExcelFile(file) {
    let objFileReader = new FileReader();
    objFileReader.onload = (event) => {
      let objFiledata = event.target.result;
      let objFileWorkbook = XLS.read(objFiledata, {
        type: "binary"
      });
      this.objExcelToJSON = XLS.utils.sheet_to_row_object_array(
        objFileWorkbook.Sheets['Sheet1']
      );
      //Verify if the file content is not blank
      if (this.objExcelToJSON.length === 0) {
        this.strUploadFileName = "";
        this.dispatchEvent(
          new ShowToastEvent({
            title: "Error",
            message: "Kindly upload the file with data",
            variant: "error"
          })
        );

      }

      if (this.objExcelToJSON.length > 0) {
        //Remove the whitespaces from the javascript object
        Object.keys(this.objExcelToJSON).forEach((key) => {
          const replacedKey = key.trim().toUpperCase().replace(/\s\s+/g, "_");
          if (key !== replacedKey) {

            this.objExcelToJSON[replacedKey] = this.objExcelToJSON[key];

            delete this.objExcelToJSON[key];

          }

        });
        console.log(JSON.stringify(this.objExcelToJSON));
        //console.log('objExcelToJSON'+this.objExcelToJSON);
        //console.log(this.objExcelToJSON[0]['Product name']);
        /**Update The Values to Database */
            const fields = {};
            fields[ID_FIELD.fieldApiName] = this.recordId;
            fields[custproducts.fieldApiName] = JSON.stringify(this.objExcelToJSON);
            const recordInput = { fields };

            updateRecord(recordInput)
                .then(() => {
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: 'Success',
                            message: 'Quote updated',
                            variant: 'success'
                        })
                    );
                })
                .catch(error => {
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: 'Error creating record',
                            message: error.body.message,
                            variant: 'error'
                        })
                    );
                });
      }

    };

    objFileReader.onerror = function (error) {
      this.dispatchEvent(
        new ShowToastEvent({
          title: 'Error while reading the file',
          message: error.message,
          variant: 'error'
        })

      );

    };

    objFileReader.readAsBinaryString(file);

  }

}