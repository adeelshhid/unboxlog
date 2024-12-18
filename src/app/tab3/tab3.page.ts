import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { trash, settingsOutline } from 'ionicons/icons';
import { Observable } from 'rxjs';
import { PhotoService } from '../services/photo.service';
import { StorageService } from '../services/storage.service';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss']
})
export class Tab3Page {
  images$: Observable<string[]>;

  constructor(public photoService: PhotoService, private router: Router,
    private storageService:StorageService
  ) {
    addIcons({ trash,settingsOutline });
    this.images$ = this.photoService.images$;
  }

  ngOnInit() {
  }

  deleteImage(index: number) {
    this.photoService.deleteImage(index);
  }

  closeGallery() {
    console.log('Galerie geschlossen');
  }

  navigateToSettings() {
    this.router.navigate(['/tabs/tab2']);
  }

  downloadImg(img:string,index:number){
  //   let url = this.storageService.saveBase64AsImage(img,'img_'+index)
  //  let imgEl =  document.createElement('img') as HTMLImageElement;
  //  imgEl.src = url
  //  imgEl.height = 200;
  //  imgEl.width = 200;
  // document.querySelector('ion-content')?.append(imgEl)

  }
}
