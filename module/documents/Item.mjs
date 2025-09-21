export class ZWolfItem extends Item {
  prepareData() {
    super.prepareData();
  }
  
  getRollData() {
    const rollData = super.getRollData();
    if (!rollData) return null;
    return rollData;
  }
  
  async roll() {
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const rollMode = game.settings.get('core', 'rollMode');
    const label = `[${this.type}] ${this.name}`;

    ChatMessage.create({
      speaker: speaker,
      rollMode: rollMode,
      flavor: label,
      content: this.system.description ?? ''
    });
  }
}
