/**
 * Extended Item document class for Z-Wolf Epic.
 * @extends {Item}
 */
export class ZWolfItem extends Item {

    prepareData() {
        super.prepareData();
    }

    prepareDerivedData() {
        const itemData = this;
        const systemData = itemData.system;

        // Make modifications to data here.
    }

    getRollData() {
        const data = { ...super.getRollData() };

        // Include the item's own system data
        if (this.system) {
            data.item = { ...this.system };
        }

        return data;
    }
}
