import { HttpLib } from "../lib/httpLib";

describe('lib test', () => {

    it('HttpLib.downloadAsBase64()', async () => {
        const url = "https://cdn.discordapp.com/attachments/1203960879159447593/1207981780204789791/plzhans_create_an_image_that_goes_well_with_the_following_sente_71336911-fe97-4db5-a6f4-41e2c296a260.png?ex=65e19fb3&is=65cf2ab3&hm=cd97b1d3340f06096efd44957805bc2a4ffa88d6bc012b23b49b6cc09e9cea8c&";
        const result = await HttpLib.downloadAsBase64(url);
        expect(result).not.toBeUndefined();
    });

})