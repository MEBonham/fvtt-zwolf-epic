const { ItemSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Item sheet for Z-Wolf Epic items.
 * @extends {ItemSheetV2}
 */
export class ZWolfItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {

    static DEFAULT_OPTIONS = {
        classes: ["zwolf-epic", "sheet", "item"],
        position: {
            width: 500,
            height: 400
        },
        actions: {
            editImage: ZWolfItemSheet.#onEditImage
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
            template: "systems/zwolf-epic/templates/item/item-sheet.hbs"
        }
    };

    async _prepareContext(options) {
        const context = await super._prepareContext(options);

        context.system = this.item.system;

        return context;
    }

    static async #onEditImage(event, target) {
        const currentImage = this.item.img;
        const fp = new FilePicker({
            type: "image",
            current: currentImage,
            callback: async (path) => {
                await this.item.update({ img: path });
            }
        });
        fp.browse();
    }
}
