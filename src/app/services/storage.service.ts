import { EventEmitter, Injectable } from '@angular/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { PhotoService } from './photo.service';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { FTP } from '@awesome-cordova-plugins/ftp/ngx'; // Import FTP Plugin

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  storageType = new BehaviorSubject<string>('ftp');
  fileUploaded: EventEmitter<boolean> = new EventEmitter();
  private ftpConfig = {
    host: 'ftp.dlptest.com',
    port: 21,
    username: 'dlpuser',
    password: 'rNrKYTX9g7z3RgJRmxWuGHbeu',
    nativePath: '',
    timeout: 60000
  };

  private cloudConfig = {
    apiUrl: '',
    apiKey: ''
  };

  constructor(private photoService: PhotoService, private ftp: FTP,

  ) { }

  setStorageType(type: 'local' | 'test' | 'cloud' | 'ftp') {
    this.storageType.next(type);
  }

  getStorageType() {
    return this.storageType.value;
  }

  setCloudConfig(apiUrl: string, apiKey: string) {
    this.cloudConfig = { apiUrl, apiKey };
  }

  // saveAnswers(kundennummer: string, name: string, answers: any): Promise<any> {
  //   return new Promise(async (resolve, reject) => {
  //     try {
  //       console.log("Starting save process...");
  //       switch (this.storageType.value) {
  //         case 'local':
  //           await this.saveToLocal(kundennummer, name, answers);
  //           break;
  //         case 'test':
  //           await this.saveToTest(kundennummer, name, answers);
  //           break;
  //         case 'cloud':
  //           await this.saveToCloud(kundennummer, name, answers);
  //           break;
  //         case 'ftp':
  //           await this.saveToFTP(kundennummer, name, answers).then(res =>{
  //             if (res) {
  //               alert(res)
  //               resolve(true)
  //             }
  //           });
  //           break;
  //         default:
  //           await this.saveToLocal(kundennummer, name, answers);
  //       }
  //       console.log("Save process completed successfully.");
  //     } catch (error) {
  //       console.error('Error in saveAnswers:', error);
  //       reject(error); // Reject promise if an error occurs
  //     }
  //   });
  // }


  async saveToLocal(kundennummer: string, name: string, answers: any): Promise<void> {
    const folderName = `KD${kundennummer} ${name}`;

    try {
      await Filesystem.mkdir({
        path: folderName,
        directory: Directory.Documents,
        recursive: true
      });

      await this.saveAnswersAsTxt(folderName, answers);
      await this.saveImages(folderName);

      console.log('Daten lokal gespeichert');
    } catch (error) {
      console.error('Fehler beim lokalen Speichern:', error);
      throw error;
    }
  }

  async saveToTest(kundennummer: string, name: string, answers: any): Promise<void> {
    console.log('Test-Modus Speicherung:', {
      kundennummer,
      name,
      answers,
      images: await this.photoService.getImages()
    });
  }

  async saveToCloud(kundennummer: string, name: string, answers: any): Promise<void> {
    if (!this.cloudConfig.apiKey || !this.cloudConfig.apiUrl) {
      throw new Error('Cloud-Konfiguration fehlt');
    }

    console.log('Cloud-Speicherung simuliert:', {
      apiUrl: this.cloudConfig.apiUrl,
      data: {
        kundennummer,
        name,
        answers,
        images: await this.photoService.getImages()
      }
    });
  }

  async saveToFTP(kundennummer: string, name: string, answers: any): Promise<boolean> {
    const sanitizedName = name.replace(/\s+/g, '_');
    const folderName = `${kundennummer}_${sanitizedName}`;

    try {
      console.log(`Connecting to FTP server...`);
      await this.ftp.connect(this.ftpConfig.host, this.ftpConfig.username, this.ftpConfig.password);

      // Create directory if it doesn't exist
      try {
        await this.ftp.mkdir(folderName);
      } catch (err: any) {
        if (err.code !== 550) throw err; // Ignore "directory exists" error
      }

      console.log(`Saving answers to FTP...`);
      await this.uploadTextFile(folderName, answers);

      console.log(`Uploading images to FTP...`);
      await this.uploadImagesToFTP(folderName);

      await this.ftp.disconnect();
      console.log(`FTP upload complete.`);
      return true;
    } catch (error: any) {
      console.error(`Error saving to FTP: ${error.message}`);
      await this.ftp.disconnect(); // Ensure FTP is disconnected on failure
      throw error;
    }
  }

  private async uploadTextFile(folderName: string, answers: any): Promise<void> {
    const fileName = 'antworten.txt';
    const answersText = this.formatAnswersAsText(answers);
    const localFilePath = `${folderName}/${fileName}`;

    await Filesystem.mkdir({
      path: folderName,
      directory: Directory.Documents,
      recursive: true
    });

    await Filesystem.writeFile({
      path: localFilePath,
      data: answersText,
      directory: Directory.Documents,
      encoding: Encoding.UTF8
    });

    const { uri } = await Filesystem.getUri({
      path: localFilePath,
      directory: Directory.Documents
    });

    await firstValueFrom(this.ftp.upload(uri, `${folderName}/${fileName}`));
    // await Filesystem.deleteFile({ path: localFilePath, directory: Directory.Documents });
  }

  // private async uploadImagesToFTP(folderName: string): Promise<void> {
  //   const images = await this.photoService.getImages();

  //   if (images.length === 0) {
  //     console.log(`No images to upload.`);
  //     return;
  //   }

  //   for (let i = 0; i < images.length; i++) {
  //     const imageData = images[i].replace(/^data:image\/\w+;base64,/, '');
  //     const imageFileName = `bild_${i + 1}.jpg`;
  //     const localImagePath = `${folderName}/${imageFileName}`;

  //     const savedPath = await this.saveBase64AsJpeg(imageData, imageFileName);

  //     const { uri } = await Filesystem.getUri({
  //       path: localImagePath,
  //       directory: Directory.Documents
  //     });

  //     await firstValueFrom(this.ftp.upload(uri, `${imageFileName}`));
  //     await Filesystem.deleteFile({ path: localImagePath, directory: Directory.Documents });
  //   }
  // }

  private async uploadImagesToFTP(folderName: string): Promise<void> {
    const images = await this.photoService.getImages();

    if (images.length === 0) {
      console.log(`No images to upload.`);
      return;
    }

    for (let i = 0; i < images.length; i++) {
      // const imageData = images[i].replace(/^data:image\/\w+;base64,/, '');
      const imageData = images[i]
      const imageFileName = `bild_${i + 1}.jpg`;

      // Save the image locally first
      const savedPath = await this.saveBase64AsImage(imageData, imageFileName);

      console.log('temp path: ', savedPath)
      // Get the local URI for the saved image
      // const { uri } = await Filesystem.getUri({
      //   path: `${folderName}/${imageFileName}`,
      //   directory: Directory.Documents
      // });

      const remotePath = `/${folderName}/${imageFileName}`;

      try {
        // console.log(`Uploading image: localPath=${uri}, remotePath=${remotePath}`);
        await firstValueFrom(this.ftp.upload(savedPath, remotePath));
        console.log(`Successfully uploaded ${remotePath}`);
      } catch (error) {
        console.error(`Failed to upload ${remotePath}:`, error);
        throw error; // Stop further uploads on failure
      } finally {
        // Clean up the local file
        // await Filesystem.deleteFile({ path: `${folderName}/${imageFileName}`, directory: Directory.Documents });
      }
    }
  }

  private async saveBase64AsJpeg(base64Image: string, fileName: string): Promise<string> {
    const filePath = `${fileName}`;

    const result = await Filesystem.writeFile({
      path: filePath,
      data: base64Image,
      directory: Directory.Documents,
      encoding: Encoding.UTF8
    });

    return result.uri;
  }

  //  saveBase64AsImage(base64: string, fileName: string) {
  //   const base64Data = base64.split(',')[1]; // Remove the data URL prefix if any

  //   // Convert base64 string to binary data
  //   const byteCharacters = atob(base64Data);
  //   const byteArrays = [];

  //   // Create a byte array from the base64 string
  //   for (let offset = 0; offset < byteCharacters.length; offset += 512) {
  //     const slice = byteCharacters.slice(offset, offset + 512);
  //     const byteNumbers = new Array(slice.length);
  //     for (let i = 0; i < slice.length; i++) {
  //       byteNumbers[i] = slice.charCodeAt(i);
  //     }
  //     byteArrays.push(new Uint8Array(byteNumbers));
  //   }

  //   // Create a Blob from the byte array (image/jpeg type)
  //   const blob = new Blob(byteArrays, { type: 'image/jpeg' });

  //   // Create a temporary link element to trigger the download
  //   const objectURL = URL.createObjectURL(blob);  // Create an object URL for the Blob
  //   console.log(objectURL)
  //   return objectURL                                // Trigger the download
  // }

  async saveBase64AsImage(base64: string, fileName: string): Promise<string> {
    try {
      // Remove the data URL prefix if present
      const base64Data = base64.split(',')[1];

      // Save the file
      const result = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Data, // You can use other directories like Directory.Documents
      });

      console.log('File saved at:', result.uri);
      const { uri } = await Filesystem.getUri({
        path: fileName,
        directory: Directory.Data
      });
      return uri; // Return the file URI
    } catch (error) {
      console.error('Error saving file:', error);
      throw error;
    }
  }

  async saveAnswersAsTxt(folderPath: string, answers: any): Promise<void> {
    const fileName = 'antworten.txt';
    const textContent = this.formatAnswersAsText(answers);

    await Filesystem.writeFile({
      path: `${folderPath}/${fileName}`,
      data: textContent,
      directory: Directory.Documents,
      encoding: Encoding.UTF8
    });
  }

  async saveImages(folderPath: string): Promise<void> {
    const images = await this.photoService.getImages();

    for (let i = 0; i < images.length; i++) {
      const imageData = images[i].replace(/^data:image\/\w+;base64,/, '');
      const fileName = `bild_${i + 1}.jpg`;

      await Filesystem.writeFile({
        path: `${folderPath}/${fileName}`,
        data: imageData,
        directory: Directory.Documents
      });
    }
  }

  private formatAnswersAsText(answers: any): string {
    const formattedAnswers = [
      `Umverpackung: ${answers.Umverpackung}`,
      `Polsterung: ${answers.Polsterung}`,
      `Gehäuse Karton: ${answers.fragen[2]}`,
      `Inlets: ${answers.fragen[3]}`,
      `Innenraumsicherung: ${answers.innenraumsicherungStatus ? `Ja - ${answers.innenraumsicherungStatus}` : 'Nein'}`,
      `Gehäuse beschädigt: ${answers['Gehäuse beschädigt']}`,
      `Gebrauchspuren: ${answers.fragen[6]}`,
      `GPU ausgebaut mitgeschickt: ${answers.fragen[7]}`,
      `Zubehör mitgeschickt: ${answers.fragen[8]}`,
      `Reklamationsschein: ${answers.fragen[9]}`,
      '',
      `Sonstiges: ${answers.Sonstiges || ''}`,
      'Windows:'
    ];

    return formattedAnswers.join('\n');
  }
}
