import { Injectable } from '@angular/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { PhotoService } from './photo.service';
import { BehaviorSubject } from 'rxjs';
import { FTP } from '@awesome-cordova-plugins/ftp/ngx'; // Import FTP Plugin

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private storageType = new BehaviorSubject<string>('ftp');
  private ftpConfig = {
    host: 'ftp.dlptest.com',
    port: 21,
    username: 'dlpuser',
    password: 'rNrKYTX9g7z3RgJRmxWuGHbeu',
    nativePath: ''
  };

  private cloudConfig = {
    apiUrl: '',
    apiKey: ''
  };

  constructor(private photoService: PhotoService, private ftp: FTP) { }

  setStorageType(type: 'local' | 'test' | 'cloud' | 'ftp') {
    this.storageType.next(type);
  }

  getStorageType() {
    return this.storageType.value;
  }

  setCloudConfig(apiUrl: string, apiKey: string) {
    this.cloudConfig = { apiUrl, apiKey };
  }

  saveAnswers(kundennummer: string, name: string, answers: any): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        console.log("Starting save process...");
        switch (this.storageType.value) {
          case 'local':
            await this.saveToLocal(kundennummer, name, answers);
            break;
          case 'test':
            await this.saveToTest(kundennummer, name, answers);
            break;
          case 'cloud':
            await this.saveToCloud(kundennummer, name, answers);
            break;
          case 'ftp':
            await this.saveToFTP(kundennummer, name, answers);
            break;
          default:
            await this.saveToLocal(kundennummer, name, answers);
        }
        console.log("Save process completed successfully.");
        resolve(); // Resolve promise after successful save
      } catch (error) {
        console.error('Error in saveAnswers:', error);
        reject(error); // Reject promise if an error occurs
      }
    });
  }
  

  private async saveToLocal(kundennummer: string, name: string, answers: any): Promise<void> {
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

  private async saveToTest(kundennummer: string, name: string, answers: any): Promise<void> {
    console.log('Test-Modus Speicherung:', {
      kundennummer,
      name,
      answers,
      images: await this.photoService.getImages()
    });
  }

  private async saveToCloud(kundennummer: string, name: string, answers: any): Promise<void> {
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

  private async saveToFTP(kundennummer: string, name: string, answers: any): Promise<void> {
    const sanitizedName = name.replace(/\s+/g, '_');
    const folderName = `${kundennummer}_${sanitizedName}`;
    
    try {
      console.log(`Connecting to FTP host: "${this.ftpConfig.host}"`);
      await this.ftp.connect(this.ftpConfig.host, this.ftpConfig.username, this.ftpConfig.password);
    
      // Create the directory on FTP
      try {
        await this.ftp.mkdir(folderName);
        console.log(`Directory created: "${folderName}"`);
      } catch (err: any) {
        if (err.code === 550) {
          console.log(`Directory already exists: "${folderName}"`);
        } else {
          throw err;
        }
      }
    
      // Format the answers as text
      const answersText = this.formatAnswersAsText(answers);
      const fileName = 'antworten.txt';
      
      // Save the answers as a temporary local file
      const localFilePath = `${folderName}/${fileName}`;
      
      // Ensure the parent directory exists on the local filesystem
      await Filesystem.mkdir({
        path: folderName,
        directory: Directory.Documents,
        recursive: true
      });
      
      // Write the answers text to the local file
      await Filesystem.writeFile({
        path: localFilePath,
        data: answersText,
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });
    
      console.log(`Local file created: "${localFilePath}"`);
    
      // Get the full file path
      const { uri } = await Filesystem.getUri({
        path: localFilePath,
        directory: Directory.Documents
      });
  
      console.log(`Local file URI: "${uri}"`);
    
      // Upload the local file to FTP
      console.log(`Uploading file to FTP: "${uri}"`);
      await this.ftp.upload(uri, `${folderName}/${fileName}`).toPromise();
    
      // Delete the local file after upload
      await Filesystem.deleteFile({
        path: localFilePath,
        directory: Directory.Documents
      });
      console.log(`Local file deleted: "${localFilePath}"`);
    
      // Save images to FTP
      const images = await this.photoService.getImages();
      if (images.length > 0) {
        for (let i = 0; i < images.length; i++) {
        const imageData = images[i].replace(/^data:image\/\w+;base64,/, '');
        const imageFileName = `bild_${i + 1}.jpg`;
        const imageFilePath = `${folderName}/${imageFileName}`;
        console.log(`Uploading image: "${imageFilePath}"`);
        await this.ftp.upload(imageData, imageFilePath).toPromise();
      }
      }
    
      // console.log('Data saved to FTP successfully');
      await this.ftp.disconnect();
      return console.log('Data saved to FTP successfully');

    } catch (error: any) {
      console.error('Error saving to FTP:', error.message, error);
      throw error;
    }
  }
  
  

  private async saveAnswersAsTxt(folderPath: string, answers: any): Promise<void> {
    const fileName = 'antworten.txt';
    const textContent = this.formatAnswersAsText(answers);

    await Filesystem.writeFile({
      path: `${folderPath}/${fileName}`,
      data: textContent,
      directory: Directory.Documents,
      encoding: Encoding.UTF8
    });
  }

  private async saveImages(folderPath: string): Promise<void> {
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
