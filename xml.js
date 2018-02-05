module.exports = {

    parseXML: function(xml, callback) {
        let i = 0, level = 0;
        let json = {};
        let objects = [];

        xml = xml
        .replace(/(\r?\n|\r)|(<\?.*\?>)|(<!--.*-->)/g, "")
        .replace(/\t/g, " ")
        .replace(/\/>/g, "></>");

        while (i < xml.length) {
            if (xml.charAt(i) === "<") {
                let node = "";
                i++;

                while (xml.charAt(i) !== " " && xml.charAt(i) !== ">" && i < xml.length) {
                    node += xml.charAt(i);
                    i++;
                }

                if (node.charAt(0) === "/") {
                    level--;
                }
                else {
                    level++;

                    let obj = {
                        "name": node,
                        "level": level,
                        "attributes": {},
                        "elements": {}
                    };

                    while (xml.charAt(i) === " ") {
                        while (xml.charAt(i) === " ") {
                            i++;
                        }

                        let attribute = "";

                        while (xml.charAt(i - 1) !== "=" && i < xml.length) {
                            attribute += xml.charAt(i);
                            i++;
                        }
                        i++;

                        while (!(xml.charAt(i) === "\"" && xml.charAt(i - 1) !== "\\") && i < xml.length) {
                            attribute += xml.charAt(i);
                            i++;
                        }
                        i++;

                        let attr = attribute.split("=");
                        obj.attributes[attr[0]] = attr[1];
                    }

                    let content = "";
                    i++;

                    if (xml.charAt(i) === "\"") {
                        i++;
                        while (!(xml.charAt(i) === "\"" && xml.charAt(i - 1) !== "\\") && i < xml.length) {
                            content += xml.charAt(i);
                            i++;
                        }
                    }
                    else {
                        while (xml.charAt(i) !== "<" && i < xml.length) {
                            content += xml.charAt(i);
                            i++;
                        }
                        i--;
                    }

                    if (!/^\s*$/.test(content)) {
                        obj.value = content;
                    }

                    objects.push(obj);
                }
            }

            i++;
        }

        json = objects[0];

        let n = 1;
        let hierarchy = [json];

        while (n < objects.length) {
            let obj = objects[n];
            let parent = hierarchy[hierarchy.length - 1];

            if (obj.level <= parent.level) {
                for (let x = -1; x < parent.level - obj.level; x++) {
                    hierarchy.splice(hierarchy.length - 1, 1);
                }

                parent = hierarchy[hierarchy.length - 1];
            }

            hierarchy.push(obj);

            let index = 0;

            while(parent.elements.hasOwnProperty(obj.name + "[" + index + "]")) {
                index++;
            }

            parent.elements[obj.name + "[" + index + "]"] = obj;

            n++;
        }

        for (let node in objects) {
            delete objects[node].level;
        }

        callback(null, json);
    },

    parseJSON: function(json, callback) {
        let xml = "";
        let level = 0;

        addNode(json, function() {
            xml += "</" + json.name + ">\n";
        });

        function addNode(node, cb) {
            for (let x = 0; x < level * 2; x++) {
                xml += " ";
            }
            xml += "<" + node.name;

            for (let key in node.attributes) {
                xml += " " + key + "=\"" + node.attributes[key] + "\"";
            }
            xml += ">";

            if (node.hasOwnProperty("value")) {
                xml += node.value;
            }

            if (Object.keys(node.elements).length > 0) {
                xml += "\n";
            }

            for (let child in node.elements) {
                level++;
                addNode(node.elements[child], function() {
                    if (Object.keys(node.elements[child].elements).length > 0) {
                        for (let x = 0; x < level * 2; x++) {
                            xml += " ";
                        }
                    }

                    level--;
                    xml += "</" + node.elements[child].name + ">\n";
                });
            }

            cb();
        }

        callback(null, xml);
    }
}
