/**
 * Base data model for all actor types in Z-Wolf Epic.
 * @extends {foundry.abstract.TypeDataModel}
 */
export class ZWolfActorBase extends foundry.abstract.TypeDataModel {

    static LOCALIZATION_PREFIXES = ["ZWOLF.Actor"];

    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            health: new fields.SchemaField({
                value: new fields.NumberField({
                    required: true,
                    initial: 10,
                    integer: true
                }),
                max: new fields.NumberField({
                    required: true,
                    initial: 10,
                    integer: true
                })
            }),
            biography: new fields.HTMLField({ required: false, blank: true })
        };
    }

    prepareDerivedData() {
        // Calculate derived data here
    }
}
