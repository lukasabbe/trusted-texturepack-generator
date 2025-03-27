const fetch = require('node-fetch');
const fs = require("fs");
var size_of = require('image-size');
require('dotenv').config();

async function main() {
    let trusted_spelare = await get_whitelist();
    trusted_spelare = JSON.parse(trusted_spelare);
    let banned_spelare = await get_banned_players();
    banned_spelare = JSON.parse(banned_spelare);
    make_pack()
    const carved_pumpkin_item_obj = {
        model : {
            type : "minecraft:select",
            property : "minecraft:component",
            component :  "minecraft:custom_name",
            cases : [],
            fallback : {
                type : "minecraft:model",
                model: "minecraft:block/carved_pumpkin"
            }
        }
    }
    for(let i = 0; i < trusted_spelare.length; i++){
        let namn = trusted_spelare[i].name.toLowerCase();
        console.clear();
        if(banned_spelare.find(element => element.uuid == trusted_spelare[i].uuid) != undefined){
            console.log("This person is banned")
            await wait(500)
            continue;
        }
        console.log("Going thru all players in list, it will take a longer time because not being rate limited")
        console.log(`Current player: ${namn} - ${i}/${trusted_spelare.length}}`)
        let data = await getSkin(trusted_spelare[i].uuid, namn);
        if(data == null) continue;
        let properties = "";
        carved_pumpkin_item_obj.model.cases.push({
            when: data[1],
            model: {
                type: "minecraft:model",
                model: `trusted_skin_pack:item/${data[1]}`
            }
        })
        copyJsonFile(data[0], data[1])
        await wait(500)
    }
    fs.writeFileSync("./skin-pack/assets/minecraft/items/carved_pumpkin.json", JSON.stringify(carved_pumpkin_item_obj))
}

function getSkin(uuid, name){
    return new Promise((resolve, reject) =>{
        fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`,{
            method: 'GET'
        }).then(async t =>{
            if(t.status != 200) return resolve(null);
            let json_data = await t.json();
            data = JSON.parse((Buffer.from(json_data.properties[0].value,"base64").toString('ascii')))
            let wierd = await saveSkin(data.textures.SKIN.url, data.profileName.toLowerCase())

            if(wierd == "wiredTexture")
                resolve(["old", data.profileName.toLowerCase()])

            else if(data.textures.SKIN.metadata == undefined){
                resolve(["normal", data.profileName.toLowerCase()])
            }
            else{
                resolve([data.textures.SKIN.metadata.model, data.profileName.toLowerCase()])
            }
        })
    })
}

function saveSkin(link,name){
    return new Promise((resolve, reject) =>{
        fetch(link,{
            method: 'GET'
        }).then(async t =>{
            const path = "./skin-pack/assets/trusted_skin_pack/textures/item/";
            let stream = t.body.pipe(fs.createWriteStream(`${path}/${name}.png`))
            stream.on('finish', () => {
                size_of(`${path}/${name}.png`, function (err, dim){
                    if(dim.height == 32){
                        resolve("wiredTexture")
                    }
                    else{
                        resolve("normal")
                    }
                })
            })
        })
    })
}

function wait(time){
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve()
        }, time);
    })
}


function make_pack(){
    fs.mkdirSync("./skin-pack");
    let pack_mcmeta = {
        "pack":{
            "pack_format":55,
            "description":"Skin pack\nMade by Lukasabbe"
        }
    }
    fs.writeFileSync("./skin-pack/pack.mcmeta", JSON.stringify(pack_mcmeta));
    fs.mkdirSync("./skin-pack/assets");
    fs.mkdirSync("./skin-pack/assets/minecraft");
    fs.mkdirSync("./skin-pack/assets/minecraft/items");
    fs.mkdirSync("./skin-pack/assets/trusted_skin_pack");
    fs.mkdirSync("./skin-pack/assets/trusted_skin_pack/models");
    fs.mkdirSync("./skin-pack/assets/trusted_skin_pack/models/item");
    fs.mkdirSync("./skin-pack/assets/trusted_skin_pack/textures");
    fs.mkdirSync("./skin-pack/assets/trusted_skin_pack/textures/item");
}

function copyJsonFile(format, username){
    const model_path = `./skin-pack/assets/trusted_skin_pack/models/item/${username}.json`;
    fs.copyFileSync(`${format}.json`, model_path)
    let file = fs.readFileSync(model_path);
    file = file.toString().replace("./player", "trusted_skin_pack:item/"+username)
    fs.writeFileSync(model_path, file)
}


function get_whitelist(){
    return new Promise((resolve, reject) =>{
        fetch(process.env.WHITELIST_LINK).then(async t =>{
            t.blob().then(async blob =>{
                resolve(await blob.text());
            })
        })
    })
}
function get_banned_players(){
    return new Promise((resolve, reject) =>{
        fetch(process.env.BANNED_PLAYERS_LINK).then(async t =>{
            t.blob().then(async blob =>{
                resolve(await blob.text());
            })
        })
    })
}
main();