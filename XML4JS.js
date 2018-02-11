// Copyright (c) 2018 TheBusyBiscuit

/**
 *   Parses XML text and outputs a JSON XMLNode object
 *
 *   @param  {String}   xml      An XML string to parse
 *   @param  {Function} callback A callback that returns an error (if thrown) and a parsed JSON Object
 */
module.exports.parseXML = function(xml, callback) {

    /** @type {Number} The index of our current character */
    let i = 0;

    /** @type {Number} The current layer in our hierarchy */
    let level = 0;

    /** @type {XMLNode} Our XML Tree*/
    let json = {};

    /** @type {XMLNode[]} A pool for all our nodes */
    let objects = [];

    /**
     *   XML content without line breaks, comments and the header element
     *   @type {String}
     */
    let doc = xml
    .replace(/(\r?\n|\r)|(<\?.*\?>)|(<!--.*-->)/g, "")
    .replace(/\t/g, " ")
    .replace(/\/>/g, "></>");

    /** Crawl through the entire document, character by character */
    while (i < doc.length) {
        /** If the current character is '<' then we start to create a new element in the xml tree */
        if (doc.charAt(i) === "<") {

            /** @type {String} The name of our current node*/
            let node = "";
            i++;

            /** Keep appending the characters, until we hit an attribute or the end of this tag */
            while (doc.charAt(i) !== " " && doc.charAt(i) !== ">" && i < doc.length) {
                node += doc.charAt(i);
                i++;
            }

            /** If the tag name starts with a '/', then we are dealing with a closing tag */
            if (node.charAt(0) === "/") {
                /** We go a step back in our hierarchy */
                level--;
            }
            else {
                /** We advanced a layer in the hierarchy */
                level++;

                /** Let's create a new Node for our examined tag and set it's level to the current layer we are in */
                let obj = new XMLNode(node);
                obj.level = level;

                /** Keep looping while there are attributes to extract */
                while (doc.charAt(i) === " ") {
                    /** We can ignore blank characters, until we hit an actual attribute */
                    while (doc.charAt(i) === " ") {
                        i++;
                    }

                    let key = "";
                    let value = "";

                    /**
                    *   Continue scanning until we hit '=' which is a sign we finished reading our key
                    *   and can start to read our value
                    */
                    while (doc.charAt(i) !== "=" && i < doc.length) {
                        key += doc.charAt(i);
                        i++;
                    }

                    i++;
                    i++;

                    /** Keep reading our attribute's value until we hit the closing quotation mark */
                    while (!(doc.charAt(i) === "\"" && doc.charAt(i - 1) !== "\\") && i < doc.length) {
                        value += doc.charAt(i);
                        i++;
                    }
                    i++;

                    /** Now we can assign our attribute to the node */
                    obj.setAttribute(key, value);
                }

                /** Start to read the inner content of our element */
                let content = "";
                i++;

                /**
                *   If our content is surrounded by quotation marks,
                *   then we don't stop reading when hitting '<'.
                *   We stop when the quotation mark is closed.
                */
                if (doc.charAt(i) === "\"") {
                    i++;
                    /** Keep reading our content, until we hit a quotation mark that is not escaped */
                    while (!(doc.charAt(i) === "\"" && doc.charAt(i - 1) !== "\\") && i < doc.length) {
                        content += doc.charAt(i);
                        i++;
                    }
                }
                else {
                    /** Keep reading until we hit a new tag '<' */
                    while (doc.charAt(i) !== "<" && i < doc.length) {
                        content += doc.charAt(i);
                        i++;
                    }
                    i--;
                }

                /** Perform a regex test, to make sure, we disallow content that contains only blank spaces */
                if (!/^\s*$/.test(content)) {
                    obj.setValue(content);
                }

                /** Add our node to the pool */
                objects.push(obj);
            }
        }

        i++;
    }

    /** The first object in the pool is our root */
    json = objects[0];

    /** @type {Number} Index for our current node from the pool */
    let n = 1;

    /** @type {XMLNode[]} Our 'Path' that can be traced back, step-by-step */
    let hierarchy = [json];

    /** Loop through all Nodes in the pool */
    while (n < objects.length) {
        let obj = objects[n];
        let parent = hierarchy[hierarchy.length - 1];

        /** Check if the current node, is not a child of the node before */
        if (obj.level <= parent.level) {
            /** Move up in the hierarchy, until we reach our current node's layer*/
            for (let x = -1; x < parent.level - obj.level; x++) {
                hierarchy.splice(hierarchy.length - 1, 1);
            }

            /** Re-assign our parent to the node's actual parent */
            parent = hierarchy[hierarchy.length - 1];
        }
        hierarchy.push(obj);
        parent.addChild(obj);

        n++;
    }

    /** Remove the level value from all nodes, we no longer need it */
    for (let node in objects) {
        delete objects[node].level;
    }

    /** We successfully parsed our XML string */
    callback(null, json);
}

/** Our XML Node class, that can contain a value, attributes and children (of type XMLNode) */
class XMLNode {

    /**
     *   Constructor for a new XML Node
     *   @param {String} name       The node's name
     *   @param {Object|String} [attributes] The node's attributes or value (if it's a String)
     *   @param {Object} [children]   Be careful with this one, refer to XMLNode#addChild(node: XMLNode) instead
     */
    constructor(name, attributes, children) {
        this.name = name;

        /** 'this.attributes' has to be a proper JSON Object */
        if (attributes instanceof Object) this.attributes = attributes;
        else if (attributes instanceof String || typeof(attributes) === "string") {
            this.attributes = {};
            this.value = attributes;
        }
        else this.attributes = {};

        /** 'this.elements' has to be a proper JSON Object */
        if (children instanceof Object) this.elements = children;
        else this.elements = {};
    }

    /**
     *   Append another XMLNode to be this Node's child
     *   @param {XMLNode} node The Child Node
     */
    addChild(node) {
        /** 'node' must be of type 'XMLNode' */
        if (!(node instanceof XMLNode)) {
            throw new TypeError("'node' must be of type 'XMLNode'");
        }

        /**
         *   Assign this node a unique id, to be identified by
         */
        let index = 0;

        while(this.elements.hasOwnProperty(node.name + "[" + index + "]")) {
            index++;
        }

        this.elements[node.name + "[" + index + "]"] = node;
    }

    /**
     *   Add/Set another XMLNode to be this node's children with a specified id/key
     *   @param {String} key  Must equal 'element[id]' where element equals the node's name and id is the index,
     *   refer to addChild(node: XMLNode) if unsure about the index
     *   @param {XMLNode} node The Child Node you want to add
     */
    setChild(key, node) {
        /** 'node' must be of type 'XMLNode' */
        if (!(node instanceof XMLNode)) {
            throw new TypeError("'node' must be of type 'XMLNode'");
        }

        /** Append the index 0 if none is specified */
        let path = key;
        if (!/^.*\[[0-9]\]$/.test(path)) {
            path += "[0]";
        }

        this.elements[path] = node;
    }

    /**
     *   Returns an XML Node that is either a direct child, or the child of a child of a... you get the idea
     *   @param  {(String|String[])} path  The name of the child node you are searching if it is a direct child, if not,
     *   then the path to your node must be specified as an array
     *   @return {XMLNode}      "This is the child node you are searching for!"
     */
    getChild(path) {
        /** We have to descent multiple times */
        if (path instanceof Array) {
            let node = this;
            for (var i in path) {
                node = node.getChild(path[i]);
            }

            return node;
        }
        /** We only have to descent once */
        else if (path instanceof String || typeof(path) === "string") {

            /** Append the index 0 if none is specified */
            let key = path;
            if (!/^.*\[[0-9]\]$/.test(key)) {
                key += "[0]";
            }

            return this.elements[key];
        }
        /** 'path' is something 'path' should not be... */
        else {
            console.log(path);
            throw new TypeError("'path' must be of type 'String' or 'Array (String)'");
        }
    }

    /**
     *   Set a node's attribute, or delete it if 'value' is null
     *   @param {String} key The attribute's key
     *   @param {String} value The value you want to set
        */
    setAttribute(key, value) {
        /** 'value' is null, so we delete our attribute */
        if (value == null) {
            delete this.attributes[key];
        }
        else {
            this.attributes[key] = value;
        }
    }

    /**
     *   Set a node's value, or delete it if 'value' is null
     *   @param {String} value The value you want to set
     */
    setValue(value) {
        /** 'value' is null, so we delete our value */
        if (value == null) {
            delete this.value;
        }
        else {
            this.value = value;
        }
    }

    /**
     *   Returns an XML String that represents this node's data structure
     *   @param  {Object|Function}   options  Options for the output (e.g. indent, new_lines)
     *   @param  {Function} callback A callback that returns an error (if thrown) and a generated XML String
     */
    asXMLString(options, callback) {
        let json = this;

        /** Generate default options, if none are specified */
        if (options == null) {
            options = defaultOptions();
        }
        /** If 'options' is a function, then use that as our callback, and use the default options instead */
        else if (options instanceof Function) {
            callback = options;
            options = defaultOptions();
        }
        /** Fill in missing options */
        else {
            let defaults = defaultOptions();
            if (!options.hasOwnProperty("indent")) options.indent = defaults.indent;
            if (!options.hasOwnProperty("new_lines")) options.new_lines = defaults.new_lines;
            if (!options.hasOwnProperty("quote_content")) options.quote_content = defaults.quote_content;
            if (!options.hasOwnProperty("header")) options.header = defaults.header;
        }

        let xml = "";
        let level = 0;

        if (options.header) {
            xml = options.header;
            if (options.new_lines) xml += "\n";
        }

        /** Add this node aka our root in this case */
        addNode(json, function() {
            xml += "</" + json.name + ">" + (options.new_lines ? "\n": "");
        });

        /**
         *   The default options for formatting XML
         *   @return {Object} default options
         */
        function defaultOptions() {
            return {
                indent: 2,
                header: "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
                quote_content: true,
                new_lines: true
            };
        }

        /**
         *   Add a new node to our XML String
         *   @param {XMLNode}   node The node we are adding
         *   @param {Function} cb   A callback for closing our node
         */
        function addNode(node, cb) {

            /** Adding indent */
            for (let x = 0; x < level * options.indent; x++) {
                xml += " ";
            }

            xml += "<" + node.name;

            /** Adding all attributes */
            for (let key in node.attributes) {
                xml += " " + key + "=\"" + node.attributes[key] + "\"";
            }
            xml += ">";

            /** Adding the node's value (if it has one) */
            if (node.hasOwnProperty("value")) {
                if (options.quote_content) xml += "\"" + node.value + "\"";
                else xml += node.value;
            }

            /** Append a new line, if there are children following this (and if the options allow us to do so) */
            if (Object.keys(node.elements).length > 0 && options.new_lines) {
                xml += "\n";
            }

            /** Adding the node's children */
            for (let child in node.elements) {
                level++;
                addNode(node.elements[child], function() {
                    // Adding indent if this child also has children. That makes our node a grandfather. Or a grandmother.
                    if (Object.keys(node.elements[child].elements).length > 0) {
                        /** Adding indent */
                        for (let x = 0; x < level * options.indent; x++) {
                            xml += " ";
                        }
                    }

                    level--;

                    /** Close our children's tag */
                    xml += "</" + node.elements[child].name + ">" + (options.new_lines ? "\n": "");
                });
            }

            /** Close our tag */
            cb();
        }

        /** We successfully generated an XML String */
        callback(null, xml);
    }

}

/** Export our class to be used when importing this module */
module.exports.XMLNode = XMLNode;
