import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { camera, images, list, arrowUndoCircleOutline } from 'ionicons/icons';
import { FormPersistenceService } from '../services/form-persistence.service';
import { PhotoService } from '../services/photo.service';
import { CameraPreview, CameraPreviewOptions } from '@capacitor-community/camera-preview';
import { Camera } from '@capacitor/camera';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss']
})
export class TabsPage {
  isCameraStarted = false;
  showFlash = false;
  bildCounter = 0;

  constructor(
    private photoService: PhotoService,
    private router: Router,
    private formPersistenceService: FormPersistenceService
  ) {
    addIcons({ camera, images, list, arrowUndoCircleOutline});
    this.photoService.images$.subscribe(images => {
      this.bildCounter = images.length;
    });
  }

  ngAfterViewInit() {
    // Kamera stoppen, wenn die Komponente zerstört wird
    this.router.events.subscribe(() => {
      if (this.isCameraStarted) {
        this.stopCamera();
      }
    });
  }

  async openCamera() {
    try {
      // Speichere die aktuellen Formulardaten
      const savedData = this.formPersistenceService.getFormData();
      if (savedData) {
        this.formPersistenceService.saveFormData(savedData);
      }

      const permission = await Camera.checkPermissions();
      if (permission.camera !== 'granted') {
        await Camera.requestPermissions();
      }
      
      this.isCameraStarted = true;
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const cameraPreviewOpts: CameraPreviewOptions = {
        position: 'rear',
        parent: 'cameraPreview',
        className: 'cameraPreview',
        toBack: false,
        storeToFile: false,
        disableAudio: true,
        x: 0,
        y: 40,
        width: window.innerWidth,
        height: window.innerHeight - 180
      };
      
      await CameraPreview.start(cameraPreviewOpts);
    } catch (error) {
      console.error('Fehler beim Öffnen der Kamera:', error);
      this.isCameraStarted = false;
    }
  }

  async stopCamera() {
    try {
      await CameraPreview.stop();
      this.isCameraStarted = false;
    } catch (error) {
      console.error('Fehler beim Stoppen der Kamera:', error);
    }
  }

  async takePicture() {
    try {
      console.log('takePicture aufgerufen');
      const picture = await CameraPreview.capture({
        quality: 90
      });
      
      if (picture && picture.value) {
        const base64PictureData = 'data:image/jpeg;base64,' + picture.value;
        console.log('Bild wird hinzugefügt');
        this.photoService.addImage(base64PictureData);
        console.log('Bildzähler vor Erhöhung:', this.bildCounter);
        
        console.log('Bildzähler nach Erhöhung:', this.bildCounter);
        
        // flash
        this.showFlash = true;
        setTimeout(() => this.showFlash = false, 200); 
      }
    } catch (error) {
      console.error('Fehler beim Aufnehmen des Fotos:', error);
    }
  }
}
