const { ActorSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Actor sheet for Z-Wolf Epic actors.
 * @extends {ActorSheetV2}
 */
export class ZWolfActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

    static DEFAULT_OPTIONS = {
        classes: ["zwolf-epic", "sheet", "actor"],
        position: {
            width: 600,
            height: 600
        },
        actions: {
            editImage: ZWolfActorSheet.#onEditImage
        },
        form: {
            submitOnChange: true
        },
        window: {
            resizable: true
        }
    };

    static PARTS = {
        main: {
            template: "systems/zwolf-epic/templates/actor/actor-sheet.hbs"
        }
    };

    async _prepareContext(options) {
        const context = await super._prepareContext(options);

        context.system = this.actor.system;
        context.items = this.actor.items;

        return context;
    }

    static async #onEditImage(event, target) {
        const currentImage = this.actor.img;
        const fp = new FilePicker({
            type: "image",
            current: currentImage,
            callback: async (path) => {
                await this.actor.update({ img: path });
            }
        });
        fp.browse();
    }
}
