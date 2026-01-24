/**
 * Extended Actor document class for Z-Wolf Epic.
 * @extends {Actor}
 */
export class ZWolfActor extends Actor {

    prepareData() {
        super.prepareData();
    }

    prepareBaseData() {
        // Data modifications in this step occur before processing embedded documents or derived data.
    }

    prepareDerivedData() {
        // Data modifications in this step occur after processing embedded documents.
        const actorData = this;
        const systemData = actorData.system;
        const flags = actorData.flags.zwolf || {};

        // Make modifications to data here.
        this._prepareCharacterData(actorData);
    }

    _prepareCharacterData(actorData) {
        if (actorData.type !== "character") return;

        // Character-specific data preparation
    }

    getRollData() {
        const data = { ...super.getRollData() };
        // Add additional roll data here
        return data;
    }
}
