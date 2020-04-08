import { NavigationMixin } from 'lightning/navigation';
import { LightningElement, wire, track, api } from 'lwc';
import { updateRecord } from 'lightning/uiRecordApi';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getAttachmentList from '@salesforce/apex/CustomFilesLWC2.getAttachmentList';
import deleteFiles from '@salesforce/apex/CustomFilesLWC2.deleteFiles';
import changeFileCategory from '@salesforce/apex/CustomFilesLWC2.changeFileCategory';
import getDownloadIds from '@salesforce/apex/CustomFilesLWC2.getDownloadIds';

import ID_FIELD from '@salesforce/schema/ContentDocument.Id';
import TITLE_FIELD from '@salesforce/schema/ContentDocument.Title';

const ACTIONS = [
    { label: 'Change Category', name: 'change_category' },
    { label: 'Preview', name: 'show_details' },
    { label: 'Delete', name: 'delete' },
];

const COLS = [
    { label: 'Attachment Name', fieldName: 'Title', editable: true, sortable: 'true', 
        cellAttributes: {
            iconName: {
                fieldName: 'Icon'
            }
        } 
    },
    { label: 'Last Modified Date', fieldName: 'LastModifiedDate', type: 'date', editable: false, sortable: 'true', initialWidth: 170 },
    { label: 'Size of File', fieldName: 'ContentSize', type: 'text', editable: false, sortable: 'true', initialWidth: 110 },
    { label: 'File Type', fieldName: 'FileKind', editable: false, sortable: 'true' },
    { label: 'Category', fieldName: 'Category', editable: false, sortable: 'true' },
    { type: 'action',
        typeAttributes: { rowActions: ACTIONS },
    },
    
];


export default class DatatableUpdateExample extends NavigationMixin(LightningElement) {

    @api recordId;
    @track currentRecordId;
    @track attachments = [];
    @track attachmentCount;
    @track error;
    @track columns = COLS;
    @track draftValues = [];
    @track record = {};
    @track sortBy;
    @track sortDirection;
    @track isTrue = false;
    @track recordsCount = 0;
    @track buttonLabel = 'Delete Selected Files';
    @track modalShow = false;
    @track currentIdSelected;
    @track currentSelectedCategory;
    @track displaySpinner = false;
    @track thereAreFiles = false;

    // non-reactive variables
    selectedRecords = [];
    refreshTable;

    connectedCallback() {

        this.currentRecordId = this.recordId;
        getAttachmentList({paramRecordId : this.currentRecordId})
            .then((data) => {

                for (let index = 0; index < data.length; index++) {

                    let fileKind;
                    let icon;
                    switch(data[index].FileType) {
                        case 'JPEG':
                        case 'JPG':
                        case 'PNG':
                        case 'GIF':
                            fileKind = 'Image';
                            icon = 'doctype:image';
                            break;

                        case 'TEXT':
                            fileKind = 'Text';
                            icon = 'doctype:txt';
                            break;

                        case 'PDF':
                            fileKind = 'PDF Document';
                            icon = 'doctype:pdf';
                            break;

                        case 'WORD_X':
                            fileKind = 'Word Document';
                            icon = 'doctype:word';
                            break;
                        
                        case 'RTF':
                            fileKind = 'Rich Text Document';
                            icon = 'doctype:rtf';
                            break;

                        case 'PPT':
                            fileKind = 'Power Point Document';
                            icon = 'doctype:ppt';
                            break;

                        case 'CSV':
                            fileKind = 'CSV Document';
                            icon = 'doctype:csv';
                            break;
                        
                        case 'EXCEL_X':
                            fileKind = 'Excel Document';
                            icon = 'doctype:excel';
                            break;

                        case 'MP3':
                            fileKind = 'Audio File';
                            icon = 'doctype:audio';
                            break;

                        case 'MP4':
                        case 'MKV':
                        case 'AVI':
                        case 'FLV':
                        case 'WEBM':
                            fileKind = 'Video File';
                            icon = 'doctype:video';
                            break;

                        case 'ZIP':
                        case 'RAR':
                            fileKind = 'Compressed File';
                            icon = 'zip';
                            break;

                        default:
                            fileKind = 'Uncategorized';
                            icon = 'doctype:attachment';
                    }

                    data[index].FileKind = fileKind;
                    data[index].Icon = icon;
                    data[index].ContentSize = (data[index].ContentSize /1024/1024).toFixed(2) + 'MB';
                    
                    if (data[index].ContentVersions[0].Category__c === undefined) {
                        data[index].Category = 'No Category';
                    } else {
                        data[index].Category = data[index].ContentVersions[0].Category__c;
                    }
                    
                    
                }

                this.attachments = data;
                this.attachmentCount =  this.attachments.length;
                if(this.attachmentCount > 0) {
                    this.thereAreFiles = true;
                }else {
                    this.thereAreFiles = false;
                }
            })
            .catch(error => {
                console.log('Error in connectedCallback()');
                console.log(JSON.parse(JSON.stringify(error)));
            })
    }


    //Method to handle the inline save of multiple records.
    handleSave(event) {
        const recordInputs =  event.detail.draftValues.slice().map(draft => {
            const fields = Object.assign({}, draft);
            return { fields };
        });
    
        const promises = recordInputs.map(recordInput => updateRecord(recordInput));
        Promise.all(promises).then(contacts => {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Files updated',
                    variant: 'success'
                })
            );
            
             this.draftValues = [];
    
             this.connectedCallback();

        }).catch(error => {
            console.log('Error saving records info handleSave()')
            console.log(error);
        });
    }


    //Method to handle the selection of the 'arrow menu' at the end of the records
    //delete the row, show preview and change category
    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const defaultRow = event.detail.row;
        const row = JSON.parse(JSON.stringify(defaultRow));
        
        let id;
        let category;

        let property
        for (property in row) {
            if (property === 'Id'){
                id = row[property];
            }

            if (property === 'Category') {
                category = row[property];
            }
        }

        this.currentSelectedCategory = category;
        this.currentIdSelected = id;
        console.log('Entered handleRowAction. Current File id selected is ' + this.currentIdSelected);

        switch (actionName) {
            case 'delete':
                this.deleteRow(id);
                break;
            case 'show_details':
                this.showPreview(id);
                break;
            case 'change_category':
                this.openModal();
                break;
            default:
                break;
        }
    }


    //Method to update the category 
    async updateFileCategory() {

        let rawCat = this.template.querySelector('.cmp-in-category');
        let cat = rawCat.value;
        
        
        await changeFileCategory({category : cat, fileId : this.currentIdSelected})
            .then(data => {
                console.log('Success changing the category');

                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Category updated',
                        variant: 'success'
                    })
                );
            })
            .catch(error => {
                console.log('Error changing the category UpdateFileCategory()');
                console.log(JSON.parse(JSON.stringify(error)));
            })

        

        this.modalShow = false; 
        this.connectedCallback();  
    }


    deleteRow(row) {
        try {
            const { id } = row;
            const index = this.findRowIndexById(id);
            if (index !== -1) {
                this.attachments = this.attachments
                    .slice(0, index)
                    .concat(this.data.slice(index + 1));
            }
        } catch(error) {
            console.log('Error trying to delete individual file deleteRow()');
            console.log(JSON.parse(JSON.stringify(error)));
        }
    }


    showPreview(id) {
        this[NavigationMixin.Navigate]({
            type: 'standard__namedPage',
            attributes: {
                pageName: 'filePreview'
            },
            state : {
                recordIds: id,
                selectedRecordId: id
            }
          })
    }


    findRowIndexById(id) {
        let ret = -1;
        this.attachments.some((row, index) => {
            if (row.id === id) {
                ret = index;
                return true;
            }
            return false;
        });
        return ret;
    }


    //Method to handle the selection of the bulk actions
    //Download or Delete the selected files
    handleSelectBulkActions(event) {
        
        console.log(event.detail.value);
        if(event.detail.value === 'download') {
            this.downloadMultipleFiles();
        }else if(event.detail.value === 'delete') {
            this.deleteSelectedFiles();
        }
    }
 

    deleteSelectedFiles() {
        if (this.selectedRecords.length > 0) {

            let userConfirm = confirm('Are you sure to delete these files?');
            if(userConfirm){

                this.buttonLabel = 'Processing....';
                this.isTrue = true;

                this.delFiles();
            }
  
        } else {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'No Files Selected', 
                    message: 'Please select files to delete first', 
                    variant: 'error'
                }),
            );
        }
    }


    delFiles() {
        deleteFiles({lstConIds: this.selectedRecords})
        .then(result => {
            window.console.log('result ====> ' + result);

            this.buttonLabel = 'Delete Selected Files';
            this.isTrue = false;

            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success', 
                    message: this.recordsCount + ' files was deleted.', 
                    variant: 'success'
                }),
            );
            
            this.template.querySelector('lightning-datatable').selectedRows = [];

            this.recordsCount = 0;

            this.connectedCallback();

        })
        .catch(error => {
            console.log('Error deleting multiple files delFiles()');
            window.console.log(JSON.parse(JSON.stringify(error)));
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error while getting Contacts', 
                    message: error.message, 
                    variant: 'error'
                }),
            );
        });
    }

    
    async downloadMultipleFiles() {
        
        if (this.selectedRecords.length > 0) {    
            
            this.displaySpinner = true;
            let contentVersionIds;
            let finalLink = '/sfc/servlet.shepherd/version/download';

            await getDownloadIds({ fileIdList : this.selectedRecords})
                .then(data => {
                    contentVersionIds = data;
                })
                .catch(error => {
                    console.log('Error getting the download ids downloadMultipleFiles()');
                    console.log(JSON.parse(JSON.stringify(error)));
                })
    
            for (let index = 0; index < contentVersionIds.length; index++) {
                finalLink += '/' + contentVersionIds[index].Id;
            }

            finalLink += '?';

            
            let a = document.createElement('a');
            a.style.display = 'none';
            document.body.appendChild(a);

            a.setAttribute('href', finalLink);
            a.setAttribute('download', 'Downloaded Attachments');
            a.click();

            this.displaySpinner = false;

            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Download Completed', 
                    message: 'The files have been downloaded', 
                    variant: 'success'
                }),
            );

        } else {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'No Files Selected', 
                    message: 'Please select files to download first', 
                    variant: 'error'
                }),
            );
        }
    }


    getSelectedRecords(event) {
        const selectedRows = event.detail.selectedRows;
        
        this.recordsCount = event.detail.selectedRows.length;

        let conIds = new Set();

        for (let i = 0; i < selectedRows.length; i++) {
            conIds.add(selectedRows[i].Id);
        }

        this.selectedRecords = Array.from(conIds);

        window.console.log('selectedRecords ====> ' +this.selectedRecords);
    }


    //Methods to support the sort of the columns in the table
    handleSortdata(event) {

        this.sortBy = event.detail.fieldName;
        this.sortDirection = event.detail.sortDirection;
        this.sortData(event.detail.fieldName, event.detail.sortDirection);
    }


    sortData(fieldname, direction) {

        let parseData = JSON.parse(JSON.stringify(this.attachments));

        let keyValue = (a) => {
            return a[fieldname];
        };
 
        let isReverse = direction === 'asc' ? 1: -1;

        parseData.sort((x, y) => {
            x = keyValue(x) ? keyValue(x) : ''; 
            y = keyValue(y) ? keyValue(y) : '';

            return isReverse * ((x > y) - (y > x));
        });

        this.attachments = parseData;
    }


    //Method to execute after upload of new files. 
    //only refreshes everything
    handleUploadFinished(event) {
        this.connectedCallback();
    }


    //Methods to show or hide the modalbox with the category menu
    closeModal() {
        this.modalShow = false;
    }


    openModal() {
        this.modalShow = true;
    }


    //Options displayed in the category combobox inside the modalbox
    get categoryOptions() {
        return [
            { label: 'Attachment', value: 'Attachment' },
            { label: 'Agreement', value: 'Agreement' },
            { label: 'Business Plan', value: 'Business Plan' },
            { label: 'Client Proposal', value: 'Client Proposal' },
            { label: 'Contract', value: 'Contract' },
            { label: 'Compliance Document', value: 'Compliance Document' },
            { label: 'Employment Agreement', value: 'Employment Agreement' },
            { label: 'History', value: 'History' },
            { label: 'Insurance Document', value: 'Insurance Document' },
            { label: 'Letter', value: 'Letter' },
            { label: 'Quotation', value: 'Quotation' },
            { label: 'Transactional Document', value: 'Transactional Document' },
        ];
    }

    
}