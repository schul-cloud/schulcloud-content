const config = require('config');
const drmConfig = config.get('DRM');
const exiftool = require('node-exiftool');
const exiftoolBin = require('dist-exiftool');
const { removeFile } = require('../files/storageHelper.js');
const { createWatermark } = require('./drmHelpers/drm_picture.js');
const { createPdfDrm } = require('./drmHelpers/drm_pdf.js');
const { createVideoDrm } = require('./drmHelpers/drm_video.js');
const { writeExifData } = require('./drmHelpers/drm_exifInfo.js');
const { uploadAndDelete, getResourceFileList, downloadFile, getFileType } = require('./drmHelpers/handelFiles.js');
const ep = new exiftool.ExiftoolProcess(exiftoolBin);

const writeDrmMetaDataToDB = (app, resourceId, drmOptions) => {
  app.service('resources').patch(resourceId, {drmOptions: drmOptions});
};
const writeDrmFileDataToDB = (app, element) => {
  app.service('resource_filepaths').patch(element.id.toString(),{drmProtection: true });
};
const getLogoFilePath = async (app, drmOptions, resourceId, sourceFolderPath) => {
  return app.service('resource_filepaths').find({
    query: { resourceId: resourceId, path: drmOptions.watermarkImage }
  }).then(result => {
    return sourceFolderPath + '\\' + result.data[0]._id.toString();
  });
};

class DrmService {
  constructor(app) {
    this.app = app;
  }

  async get({resourceId, drmOptions, isProtected} /*, obj*/) {
    new Promise(async resolve => {
      if (isProtected === true) {
        const sourceFolderPath =
        drmConfig.absoluteLocalStoragePath + '\\'+drmConfig.downloadDir+'\\' + resourceId;
        const resourceFileList = await getResourceFileList(this.app, resourceId);
        await Promise.all(
          resourceFileList.map(data => {
            const options = {
              path: data.path,
              resourceId: resourceId,
              name: data.id,
              storageLocation: sourceFolderPath
            };
            return downloadFile(options);
          })
        );
        try {
          await ep.open();
        } catch (error) {
          console.log(error);
        }
        let logoFilePath;
        if (drmOptions.watermark) {
          logoFilePath = await getLogoFilePath(this.app, drmOptions, resourceId, sourceFolderPath);
        }
  
        await Promise.all(
          resourceFileList.map(async element => {
            
            if (element.drmProtection === false) {
              element.sourceFilePath = sourceFolderPath + '\\' + element.id;
              element.outputFilePath =
                sourceFolderPath + '\\' + element.id + '_out'; //It is sometimes not possible to override the original file
              element.remove = true; // While true the downloaded file is removed from disc at the end
              element.upload = false; // If there are files changed that have to be reuploaded set this to true
  
              let fileType = await getFileType(element.sourceFilePath);
              fileType = fileType.split(' ')[0];
              if (['JPEG', 'PNG'].includes(fileType) && drmOptions.watermark && logoFilePath != element.sourceFilePath) {
                await createWatermark(element, logoFilePath, drmOptions);
                await writeExifData(ep, drmOptions.exif, element.outputFilePath);
                writeDrmFileDataToDB(this.app, element);
              } else if (['PDF'].includes(fileType)&&drmOptions.pdfIsProtected) {
                await createPdfDrm(element);
                await writeExifData(ep, drmOptions.exif, element.outputFilePath);
                writeDrmFileDataToDB(this.app, element);
              } else if (['Matroska'].includes(fileType)&&drmOptions.videoIsProtected) {
                createVideoDrm(this.app, element, resourceId);
                writeDrmFileDataToDB(this.app, element);
              }
            }
  
          })
        );
  
        /* ###################################################################
        # Do things that have to be applied to every downloaded File here
        ###################################################################### */
        await ep.close();
        writeDrmMetaDataToDB(this.app, resourceId, drmOptions);
  
        //upload and delete Files
        uploadAndDelete(this.app, resourceFileList, sourceFolderPath);
        return resolve();
      } else if(isProtected === false){
        this.app.service('resource_filepaths').find({query:{resourceId},paginate: false}).then((result)=>{
          result.forEach((entry)=>{
            if (entry.drmProtection && entry.path.split('/').slice(1, 2) != drmConfig.originalFilesFolderName) {
              removeFile(entry._id);
              this.app.service('resource_filepaths').remove(entry._id);
            }else if (entry.drmProtection && entry.path.split('/').slice(1, 2) == drmConfig.originalFilesFolderName) {
              let newPath = entry.path.split('/');
              newPath = '/' + newPath.slice(2, newPath.length).join('/');
              this.app.service('resource_filepaths').patch(entry._id, {path: newPath, drmProtection: false});
            }
          });
          this.app.service('videoId').find({query: {resourceId: resourceId}}).then((result)=>{
            this.app.service('videoId').remove(result.data[0]._id);
          });
          this.app.service('resources').patch(resourceId, { $unset: { drmOptions: '' } });
        });
      }
     
    });
    return 'Done';
  }
}

module.exports = {
  DrmService
};