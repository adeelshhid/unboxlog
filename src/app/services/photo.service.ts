import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PhotoService {
  private images = new BehaviorSubject<string[]>([]);
  images$ = this.images.asObservable();
  private bildCounter = 0;

  addImage(image: string) {
    console.log('addImage aufgerufen');
    const currentImages = this.images.value;
    this.images.next([...currentImages, image]);
    this.bildCounter++;
  }

  deleteImage(index: number) {
    const currentImages = this.images.value;
    currentImages.splice(index, 1);
    this.images.next([...currentImages]);
    this.bildCounter--;
  }

  async getImages(): Promise<string[]> {
    return this.images.value;
  }

  clearImages() {
    this.images.next([]);
    this.bildCounter = 0;
  }
}
