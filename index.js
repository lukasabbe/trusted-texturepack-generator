const fetch = require('node-fetch');
const fs = require("fs");
var size_of = require('image-size');
require('dotenv').config();
var path = "";

async function main() {
    let trusted_spelare = await get_whitelist();
    trusted_spelare = JSON.parse(trusted_spelare);
    let banned_spelare = await get_banned_players();
    banned_spelare = JSON.parse(banned_spelare);
    path = make_pack()
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
        if(data[0] == "slim")
            properties = `type=item\nmatchItems=minecraft:carved_pumpkin\nmodel=${data[1]}_slim.json\ncomponents.minecraft\\:custom_name=ipattern:${data[1]}`
        else if(data[0] == "wierd")
            properties = `type=item\nmatchItems=minecraft:carved_pumpkin\nmodel=${data[1]}_old.json\ncomponents.minecraft\\:custom_name=ipattern:${data[1]}`
        else
            properties = `type=item\nmatchItems=minecraft:carved_pumpkin\nmodel=${data[1]}_normal.json\ncomponents.minecraft\\:custom_name=ipattern:${data[1]}`
        fs.writeFileSync(`.${path}/player-${i}.properties`,properties)
        copyJsonFile(data[0], data[1])
        await wait(500)
    }
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
                resolve(["wierd", data.profileName.toLowerCase()])

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
            let stream = t.body.pipe(fs.createWriteStream(`.${path}/${name}.png`))
            stream.on('finish', () => {
                size_of(`.${path}/${name}.png`, function (err, dim){
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
            "pack_format":34,
            "description":"Skin pack\nMade by Lukasabbe"
        }
    }
    fs.writeFileSync("./skin-pack/pack.mcmeta", JSON.stringify(pack_mcmeta));
    fs.mkdirSync("./skin-pack/assets");
    fs.mkdirSync("./skin-pack/assets/minecraft");
    fs.mkdirSync("./skin-pack/assets/minecraft/optifine");
    fs.mkdirSync("./skin-pack/assets/minecraft/optifine/cit");
    fs.mkdirSync("./skin-pack/assets/minecraft/optifine/cit/skins");
    return "/skin-pack/assets/minecraft/optifine/cit/skins"
}

function copyJsonFile(format, username){
    switch(format){
        case "slim":
            fs.copyFileSync("slim.json","./skin-pack/assets/minecraft/optifine/cit/skins/"+username+"_slim.json")
            let file = fs.readFileSync("./skin-pack/assets/minecraft/optifine/cit/skins/"+username+"_slim.json");
            file = file.toString().replace("player", username)
            fs.writeFileSync("./skin-pack/assets/minecraft/optifine/cit/skins/"+username+"_slim.json", file)
            break;
        case "normal":
            fs.copyFileSync("normal.json","./skin-pack/assets/minecraft/optifine/cit/skins/"+username+"_normal.json")
            let file2 = fs.readFileSync("./skin-pack/assets/minecraft/optifine/cit/skins/"+username+"_normal.json");
            file2 = file2.toString().replace("player", username)
            fs.writeFileSync("./skin-pack/assets/minecraft/optifine/cit/skins/"+username+"_normal.json", file2)
            break;
        case "wierd":
            fs.copyFileSync("old.json","./skin-pack/assets/minecraft/optifine/cit/skins/"+username+"_old.json")
            let file3 = fs.readFileSync("./skin-pack/assets/minecraft/optifine/cit/skins/"+username+"_old.json");
            file3 = file3.toString().replace("player", username)
            fs.writeFileSync("./skin-pack/assets/minecraft/optifine/cit/skins/"+username+"_old.json", file3)
            break

    }

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