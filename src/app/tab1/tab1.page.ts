import { Component } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormArray } from '@angular/forms';
import { AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { FormPersistenceService } from '../services/form-persistence.service';
import { PhotoService } from '../services/photo.service';
import { StorageService } from '../services/storage.service';
import { camera } from 'ionicons/icons';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page {

  frageForm!: FormGroup;
  bildCounter: number = 0;

  fragenListe: string[] = [
    'Name',
    'Kundennummer',
    'Umverpackung',
    'Polsterung',
    'Gehäuse Karton',
    'Inlets',
    'Innenraumsicherung',
    'Gehäuse beschädigt',
    'Gebrauchspuren',
    'GPU ausgebaut mitgeschickt',
    'Zubehör mitgeschickt',
    'Reklamationsschein'
  ];

  // Liste der möglichen Schäden für Gehäuse
  gehaeuseSchäden: string[] = ['Seitenteil', 'Glas', 'Frontpanel', 'Rückseite', 'I/O shield beschädigt', 'I/O Panel beschädigt'];

  constructor(
    private fb: FormBuilder,
    private alertController: AlertController,
    private storageService: StorageService,
    private photoService: PhotoService,
    private formPersistenceService: FormPersistenceService
  ) {
    addIcons({ camera, });
    this.photoService.images$.subscribe(images => {
      this.bildCounter = images.length;
    });
  }

  ngOnInit() {
    this.initializeForm();

    const savedData = this.formPersistenceService.getFormData();
    if (savedData) {
      this.frageForm.patchValue(savedData);
    }

    this.frageForm.valueChanges.subscribe(data => {
      this.formPersistenceService.saveFormData(data);
    });


  }

  private initializeForm() {
    this.frageForm = this.fb.group({
      name: ['', Validators.required],
      kundennummer: ['', Validators.required],
      fragen: this.fb.array(this.fragenListe.slice(2).map(() => this.fb.control(''))),
      polsterungStatus: [''],
      innenraumsicherungStatus: [''],
      gehaeuseBeschädigtAuswahl: [[]],
      sonstiges: ['']
    });
  }

  get fragen(): FormArray {
    return this.frageForm.get('fragen') as FormArray;
  }

  async presentPolsterungAlert() {
    console.log('Popup für Polsterung wird angezeigt');
    const alert = await this.alertController.create({
      header: 'Polsterung',
      message: 'Bitte wählen Sie den Zustand der Polsterung aus:',
      buttons: [
        {
          text: 'Gut',
          handler: () => {
            this.frageForm.get('polsterungStatus')?.setValue('gut');
            console.log('Polsterungsstatus gesetzt auf "gut"');
          }
        },
        {
          text: 'Ungenügend',
          handler: () => {
            this.frageForm.get('polsterungStatus')?.setValue('ungenügend');
            console.log('Polsterungsstatus gesetzt auf "ungenügend"');
          }
        }
      ],
      backdropDismiss: false
    });

    await alert.present();
  }

  async presentInnenraumsicherungAlert() {
    console.log('Popup für Innenraumsicherung wird angezeigt');
    const alert = await this.alertController.create({
      header: 'Innenraumsicherung',
      message: 'Bitte wählen Sie den Zustand der Innenraumsicherung aus:',
      buttons: [
        {
          text: 'Gut',
          handler: () => {
            this.frageForm.get('innenraumsicherungStatus')?.setValue('gut');
            console.log('Innenraumsicherungsstatus gesetzt auf "gut"');
          }
        },
        {
          text: 'Ungenügend',
          handler: () => {
            this.frageForm.get('innenraumsicherungStatus')?.setValue('ungenügend');
            console.log('Innenraumsicherungsstatus gesetzt auf "ungenügend"');
          }
        }
      ],
      backdropDismiss: false
    });

    await alert.present();
  }

  async presentGehaeuseBeschädigtAlert() {
    console.log('Popup für Gehäuse beschädigt wird angezeigt');

    // Setze die Auswahl zurück, sodass alle Checkboxen unmarkiert sind
    this.frageForm.get('gehaeuseBeschädigtAuswahl')?.setValue([]);

    const alert = await this.alertController.create({
      header: 'Gehäuse beschädigt',
      message: 'Bitte wählen Sie die beschädigten Teile des Gehäuses aus:',
      inputs: this.gehaeuseSchäden.map(schaden => ({
        name: schaden,
        type: 'checkbox',
        label: schaden,
        value: schaden,
        checked: false // Alle Checkboxen sind initial unmarkiert
      })),
      buttons: [
        {
          text: 'Abbrechen',
          role: 'cancel',
          handler: () => {
            console.log('Gehäuse beschädigt Popup abgebrochen');
            this.frageForm.get('gehaeuseBeschädigtAuswahl')?.setValue([]);
          }
        },
        {
          text: 'OK',
          handler: (selectedValues) => {
            this.frageForm.get('gehaeuseBeschädigtAuswahl')?.setValue(selectedValues);
            console.log('Gehäusebeschädigungen ausgewählt:', selectedValues);
            return true; // Ermöglicht das Schließen des Popups
          }
        }
      ],
      backdropDismiss: false
    });

    await alert.present();
  }

  /**
   * Speichert die Formulardaten, wenn das Formular gültig ist.
   */
  async speichern() {
    if (this.frageForm.valid) {
      const formValue = this.frageForm.value;
      const kundennummer = formValue.kundennummer;
      const name = formValue.name;

      // Strukturieren der Antworten
      const answers = {
        Umverpackung: formValue.fragen[0],
        Polsterung: formValue.fragen[1] === 'ja' ?
          `Ja - ${formValue.polsterungStatus}` : 'Nein',
        fragen: formValue.fragen,
        innenraumsicherungStatus: formValue.innenraumsicherungStatus,
        'Gehäuse beschädigt': formValue.gehaeuseBeschädigtAuswahl.length > 0
          ? `Ja - ${formValue.gehaeuseBeschädigtAuswahl.join(', ')}`
          : 'Nein',
        Sonstiges: formValue.sonstiges || ''
      };

      switch (this.storageService.storageType.value) {
        case 'local':
          await this.storageService.saveToLocal(kundennummer, name, answers).then(() => {
            this.presentSuccessAlert()
          }).catch(err => {
            this.presentErrorAlert()
          })
          break;
        case 'test':
          await this.storageService.saveToTest(kundennummer, name, answers).then(() => {
            this.presentSuccessAlert()

          }).catch(err => {
            this.presentErrorAlert()
          })
          break;
        case 'cloud':
          await this.storageService.saveToCloud(kundennummer, name, answers).then(() => {
            this.presentSuccessAlert()

          }).catch(err => {
            this.presentErrorAlert()
          })
          break;
        case 'ftp':
          await this.storageService.saveToFTP(kundennummer, name, answers).then(res => {
            this.presentSuccessAlert()
          });
          break;
        default:
          await this.storageService.saveToLocal(kundennummer, name, answers);
      }
      // // Aufrufen der Speichermethode im StorageService
      // this.storageService.saveAnswers(kundennummer, name, answers)
      //   .then(() => {
      //     this.presentSuccessAlert();
      //   })
      //   .catch(error => {
      //     console.error('Fehler beim Speichern der Antworten:', error);
      //     this.presentErrorAlert();
      //   });
    } else {
      console.log('Formular ist ungültig');
      this.presentInvalidFormAlert();
    }
  }

  /**
   * Zeigt eine Erfolgsmeldung nach dem erfolgreichen Speichern.
   */
  private async presentSuccessAlert() {
    const alert = await this.alertController.create({
      header: 'Erfolg',
      message: 'Ihre Antworten wurden erfolgreich gespeichert.',
      buttons: [{
        text: 'OK',
        handler: () => {
          this.formPersistenceService.clearFormData();
          this.frageForm.reset({
            name: '',
            kundennummer: '',
            fragen: this.frageForm.controls['fragen'].value.map(() => ''),
            polsterungStatus: '',
            innenraumsicherungStatus: '',
            gehaeuseBeschädigtAuswahl: [],
            sonstiges: ''
          });
          this.photoService.clearImages();
        }
      }]
    });

    await alert.present();
  }

  /**
   * Zeigt eine Fehlermeldung, wenn das Speichern fehlgeschlagen ist.
   */
  private async presentErrorAlert() {
    const alert = await this.alertController.create({
      header: 'Fehler',
      message: 'Beim Speichern Ihrer Antworten ist ein Fehler aufgetreten.',
      buttons: ['OK']
    });

    await alert.present();
  }

  /**
   * Zeigt eine Meldung an, wenn das Formular ungültig ist.
   */
  private async presentInvalidFormAlert() {
    const alert = await this.alertController.create({
      header: 'Ungültiges Formular',
      message: 'Bitte füllen Sie alle erforderlichen Felder aus.',
      buttons: ['OK']
    });

    await alert.present();
  }

  ionViewWillLeave() {
    this.formPersistenceService.saveFormData(this.frageForm.value);
  }

  /**
   * Eventhandler für Änderungen in den ion-segmenten.
   * Ruft die entsprechenden Alert-Methoden auf, wenn "Ja" ausgewählt wird.
   * @param index Der Index des Segments innerhalb des FormArrays
   * @param event Das IonSegmentChangeEvent
   */
  onSegmentChange(index: number, event: any) {
    const value = event.detail.value;
    if (value === 'ja') {
      switch (index) {
        case 1: // Polsterung
          this.presentPolsterungAlert();
          break;
        case 4: // Innenraumsicherung
          this.presentInnenraumsicherungAlert();
          break;
        case 5: // Gehäuse beschädigt
          this.presentGehaeuseBeschädigtAlert();
          break;
        default:
          break;
      }
    } else if (value === 'nein') {
      // Optional: Setzen Sie die zugehörigen Statusfelder zurück, falls notwendig
      switch (index) {
        case 1: // Polsterung
          this.frageForm.get('polsterungStatus')?.setValue('');
          break;
        case 4: // Innenraumsicherung
          this.frageForm.get('innenraumsicherungStatus')?.setValue('');
          break;
        case 5: // Gehäuse beschädigt
          this.frageForm.get('gehaeuseBeschädigtAuswahl')?.setValue([]);
          break;
        default:
          break;
      }
    }
  }
}
