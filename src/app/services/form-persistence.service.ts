import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FormPersistenceService {
  private formDataSubject = new BehaviorSubject<any>(null);
  formData$ = this.formDataSubject.asObservable();

  saveFormData(data: any) {
    this.formDataSubject.next(data);
  }

  getFormData() {
    return this.formDataSubject.value;
  }

  clearFormData() {
    this.formDataSubject.next(null);
  }
} 