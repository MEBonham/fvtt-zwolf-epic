// In module/sheets/token-sheet.mjs

export default class ZWolfTokenConfigSheet extends TokenConfig {

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    
    // Hide/disable bright vision input since it's always infinite
    const brightVisionInput = html.find('input[name="sight.bright"]');
    if (brightVisionInput.length) {
      brightVisionInput.prop('disabled', true);
      brightVisionInput.val('∞');
      brightVisionInput.closest('.form-group').find('label').text('Bright Vision (Always Infinite)');
    }

    // Relabel "Dim Vision" to "Dark Vision"
    const dimVisionLabel = html.find('input[name="sight.range"]').closest('.form-group').find('label');
    if (dimVisionLabel.length) {
      dimVisionLabel.text('Dark Vision');
    }

    // Add nightsight field after the vision range field
    const visionRangeGroup = html.find('input[name="sight.range"]').closest('.form-group');
    if (visionRangeGroup.length) {
      const nightsightGroup = $(`
        <div class="form-group">
          <label>Nightsight</label>
          <div class="form-fields">
            <input type="number" name="nightsight" value="${this.token.getFlag('zwolf-epic', 'nightsight') || 0}" min="0" step="1" placeholder="0">
          </div>
          <p class="notes">Vision range in dim light conditions</p>
        </div>
      `);
      visionRangeGroup.after(nightsightGroup);
    }
  }

  /** @override */
  async _updateObject(event, formData) {
    // Extract nightsight from form data
    const nightsight = formData.nightsight;
    delete formData.nightsight;

    // Set bright vision to infinite (override any form input)
    formData['sight.bright'] = Infinity;

    // Update the token with standard fields
    await super._updateObject(event, formData);

    // Set nightsight as a flag
    if (nightsight !== undefined) {
      await this.token.setFlag('zwolf-epic', 'nightsight', nightsight);
    }
  }

  /** @override */
  getData(options) {
    const data = super.getData(options);
    
    // Add nightsight to the template data
    data.nightsight = this.token.getFlag('zwolf-epic', 'nightsight') || 0;
    
    return data;
  }
}
