// JSDOM does not implement native dialog methods; real-browser tests cover modality.
if (typeof HTMLDialogElement !== 'undefined') {
HTMLDialogElement.prototype.showModal = function () { this.open = true }
HTMLDialogElement.prototype.close = function () { this.open = false }
}
