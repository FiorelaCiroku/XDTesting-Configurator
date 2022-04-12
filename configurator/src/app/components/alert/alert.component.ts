import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'config-alert',
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.scss'],
  host: {'class': 'd-block'}
})
export class AlertComponent  {

  @Input() type = 'success';
  @Input() dismissable = true;
  @Input() isOpen: unknown = true;
  @Output() isOpenChange = new EventEmitter<boolean>();

  close(): void {
    this.isOpenChange.emit(false);
    this.isOpen = false;
  }
}
