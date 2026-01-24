/**
 * Base data model for all item types in Z-Wolf Epic.
 * @extends {foundry.abstract.TypeDataModel}
 */
export class ZWolfItemBase extends foundry.abstract.TypeDataModel {

    static LOCALIZATION_PREFIXES = ["ZWOLF.Item"];

    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            description: new fields.HTMLField({ required: false, blank: true }),
            quantity: new fields.NumberField({
                required: true,
                initial: 1,
                integer: true,
                min: 0
            })
        };
    }

    prepareDerivedData() {
        // Calculate derived data here
    }
}
