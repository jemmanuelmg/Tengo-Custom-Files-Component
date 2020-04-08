/**
 * @File Name          : CustomFilesLWC2.cls
 * @Description        : 
 * @Author             : emmanuel.martinez@tengo.co
 * @Group              : 
 * @Last Modified By   : emmanuel.martinez@tengo.co
 * @Last Modified On   : 15/01/2020, 15:53:45
 * @Modification Log   : 
 * Ver       Date            Author      		    Modification
 * 1.0    15/01/2020   emmanuel.martinez@tengo.co     Initial Version
**/

public with sharing class CustomFilesLWC2 {

    @AuraEnabled
    public static List<ContentDocument> getAttachmentList(Id paramRecordId) {
        
        List<ContentDocument> listOfAttachments = new List<ContentDocument>();
    	List<ContentDocument> rawList = [SELECT 
                                        Title, 
                                        (SELECT LinkedEntityId FROM ContentDocumentLinks WHERE LinkedEntityId = :paramRecordId),                                         
                                        (SELECT Category__c  FROM ContentVersions WHERE IsLatest = true),
                                        LastModifiedDate, 
                                        ContentSize,
                                        FileType, 
                                        FileExtension
                                        FROM ContentDocument];
        
        for (ContentDocument currentRecord : rawList) {
            if(currentRecord.ContentDocumentLinks.size() > 0) {
              listOfAttachments.add(currentRecord);
            }
            
        }
        
        return listOfAttachments;
        
    }
    
    
    @AuraEnabled
    public static void deleteFiles(list<Id> lstConIds) {
        try {
            list<ContentDocument> lstConsToDelete = new list<ContentDocument>();
            System.debug('lstConIds ====> '+lstConIds);
            for(Id idCon : lstConIds) {
                lstConsToDelete.add(new ContentDocument(Id = idCon));
            }
            if(!lstConsToDelete.isEmpty()) {
                delete lstConsToDelete;
            }
        }
        catch(Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }


    @AuraEnabled
    public static void changeFileCategory(String category, Id fileId) {
    
        List<ContentVersion> rawList = [SELECT 
                                        Id
                                        FROM ContentVersion  
                                        WHERE IsLatest=true AND ContentDocumentId = :fileId];
                                        
        List<ContentVersion> listToUpdate = new List<ContentVersion>();

        for (ContentVersion currentRecord : rawList) {
            currentRecord.Category__c = category; 
            listToUpdate.add(currentRecord);
        
        }
        
        update listToUpdate;
        
    }

    
    @AuraEnabled
    public static List<ContentVersion> getDownloadIds(List<Id> fileIdList) {
        
        return [SELECT Id FROM ContentVersion WHERE IsLatest = true AND ContentDocumentId IN :fileIdList];

    }  
} 