/**
 * Base data model for all actor types in Z-Wolf Epic.
 * @extends {foundry.abstract.TypeDataModel}
 */
export class ZWolfActorBase extends foundry.abstract.TypeDataModel {

    static LOCALIZATION_PREFIXES = ["ZWOLF.Actor"];

    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            biography: new fields.HTMLField({ required: false, blank: true }),
            fairWealthRolls: new fields.ArrayField(
                new fields.NumberField({ integer: true }),
                { required: true, initial: [] }
            )
        };
    }

    prepareDerivedData() {
        // Calculate derived data here
    }
}
