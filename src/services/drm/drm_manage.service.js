const config = require('config');
const drmConfig = config.get('DRM');
const exiftool = require('node-exiftool');
const exiftoolBin = require('dist-exiftool');
const { createWatermark } = require('./drmHelpers/drm_picture.js');
const { createPdfDrm } = require('./drmHelpers/drm_pdf.js');
const { createVideoDrm } = require('./drmHelpers/drm_video.js');
const { writeExifData } = require('./drmHelpers/drm_exifInfo.js');
const { uploadAndDelete, getResourceFileList, downloadFile, getFileType } = require('./drmHelpers/handelFiles.js');
const ep = new exiftool.ExiftoolProcess(exiftoolBin);


// TODO Get logoFilePath, testDataToWrite from Frontend
const logoFilePath = 'C:\\Users\\admin\\MyStuff\\UNI\\BP\\temp\\c.png';

const testDataToWrite = {
  all: '', // remove existing tags
  comment: 'Exiftool rules!',
  'Keywords+': ['TestKeyWordNr1', 'TestKeyWordNr2'],
  CreatorAddress: 'test Address',
  CreatorWorkEmail: 'test-mail@test.de',
  CreatorWorkURL: 'test.me',
  ModelAge: '18',
  Nickname: 'testNick',
  Description: 'TestDescription',
  Creator: 'TestCreator'
};

class DrmService {
  constructor(app) {
    this.app = app;
  }

  async get({resourceId, drmOptions} /*, obj*/) {
    new Promise(async resolve => {

      const sourceFolderPath =
      drmConfig.absoluteLocalStoragePath + '\\'+drmConfig.downloadDir+'\\' + resourceId;
      const resourceFileList = await getResourceFileList(this.app, resourceId);
      await Promise.all(
        resourceFileList.map(data => {
          return downloadFile(data.path, data.id, sourceFolderPath);
        })
      );
      await ep.open();

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
            if (['JPEG', 'PNG'].includes(fileType)&&drmOptions.watermark) {
              await createWatermark(element, logoFilePath);
              await writeExifData(ep, drmOptions.exif, element.outputFilePath);
            } else if (['PDF'].includes(fileType)&&drmOptions.pdfIsProtected) {
              await createPdfDrm(element);
              await writeExifData(ep, drmOptions.exif, element.outputFilePath);
            } else if (['Matroska'].includes(fileType)&&drmOptions.videoIsProtected) {
              createVideoDrm(this.app, element, resourceId);
            }
          }

        })
      );

      /* ###################################################################
      # Do things that have to be applied to every downloaded File here
      ###################################################################### */
      await ep.close();

      //upload and delete Files
      uploadAndDelete(this.app, resourceFileList, sourceFolderPath);
      return resolve();
    });
    return 'Done';
  }
}

module.exports = {
  DrmService
};