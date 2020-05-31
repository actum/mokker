'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};

var toConsumableArray = function (arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

    return arr2;
  } else {
    return Array.from(arr);
  }
};

var queryString = require('query-string');

var transformToTernary = function transformToTernary(obj) {
  var ternaryObject = obj;

  if (!('@m_result' in obj)) {
    ternaryObject = {
      '@m_result': obj,
      '@m_docs': {
        merged: {},
        objs: []
      }
    };
  }

  return ternaryObject;
};

var getObj = function getObj(iftrueTernary, iffalseTernary) {
  var result = void 0;
  if (!iftrueTernary['@m_docs'].objs.length && !iffalseTernary['@m_docs'].objs.length) {
    result = [].concat(iftrueTernary['@m_result'], iffalseTernary['@m_result']);
  } else if (!iftrueTernary['@m_docs'].objs.length) {
    result = [].concat(iftrueTernary['@m_result'], iffalseTernary['@m_docs'].objs);
  } else if (!iffalseTernary['@m_docs'].objs.length) {
    result = [].concat(iffalseTernary['@m_result'], iftrueTernary['@m_docs'].objs);
  } else {
    result = [].concat(iftrueTernary['@m_docs'].objs, iffalseTernary['@m_docs'].objs);
  }

  return result;
};

var getHostQuery = function getHostQuery(req) {
  var hostQuery = void 0;
  var host = req.headers.referer || req.url;
  var index = host.indexOf('?');

  if (hostQuery === -1) {
    hostQuery = {};
  } else {
    var formatedHost = host.slice(index);
    hostQuery = queryString.parse(formatedHost);
  }

  return hostQuery;
};

var ternary = function ternary(_ref) {
  var condition = _ref.condition,
      iftrue = _ref.iftrue,
      iffalse = _ref.iffalse;

  var iftrueTernary = transformToTernary(iftrue);
  var iffalseTernary = transformToTernary(iffalse);

  var result = condition ? iftrueTernary['@m_result'] : iffalseTernary['@m_result'];
  var merged = Object.assign({}, iftrueTernary['@m_result'], iffalseTernary['@m_result'], iftrueTernary['@m_docs'].merged, iffalseTernary['@m_docs'].merged);
  var objs = getObj(iftrueTernary, iffalseTernary);

  return {
    '@m_result': result,
    '@m_docs': {
      merged: merged,
      objs: objs
    }
  };
};

var controllerProvider = (function (customContoller, delay) {
  return function (req, res) {
    var typeofCustomController = typeof customContoller === 'undefined' ? 'undefined' : _typeof(customContoller);
    var response = {};

    if (typeofCustomController === 'function') {
      var body = req.body,
          params = req.params,
          query = req.query;


      var hostQuery = getHostQuery(req);

      var data = {
        body: body,
        params: params,
        query: query,
        hostQuery: hostQuery
      };

      var result = customContoller(data, req, res);
      response = '@m_result' in result ? result['@m_result'] : result;
    } else if (typeofCustomController === 'object' && !Array.isArray(customContoller)) {
      response = customContoller;
    } else {
      throw new Error('Unacceptable type of controller: ' + typeofCustomController + '. It must be \'object\' or \'function\'.');
    }

    setTimeout(function () {
      return res.json(response);
    }, delay);
  };
});

var Router = require('express').Router();

Router.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With');
  next();
});

var createRouter = (function (routes) {
  routes.forEach(function (route) {
    var formatedMethod = route.method.toLowerCase();

    var controller = route.controller || route.json;
    var delay = route.delay || 0;

    try {
      Router[formatedMethod](route.url, controllerProvider(controller, delay));
    } catch (e) {
      throw new Error(formatedMethod + ' is a wrong method');
    }
  });

  return Router;
});

function parseObject(obj) {
  var parsedObject = {};
  Object.keys(obj).forEach(function (key) {
    var value = obj[key];
    var type = typeof value === 'undefined' ? 'undefined' : _typeof(value);

    if (Array.isArray(value)) {
      type = parseArray(value); // eslint-disable-line
    } else if (value === null) {
      type = 'null';
    } else if (type === 'object') {
      type = parseObject(value);
    }

    parsedObject[key] = type;
  });

  return parsedObject;
}

function parseArray(arr) {
  var parsedArray = void 0;
  var firstItem = arr[0];

  if (!firstItem) {
    parsedArray = '[]';
  } else if (Array.isArray(firstItem)) {
    parsedArray = parseArray(firstItem) + '[]';
  } else if ((typeof firstItem === 'undefined' ? 'undefined' : _typeof(firstItem)) === 'object') {
    parsedArray = [parseObject(firstItem)];
  } else {
    parsedArray = (typeof firstItem === 'undefined' ? 'undefined' : _typeof(firstItem)) + '[]';
  }

  return parsedArray;
}

var isPropMandatory = function isPropMandatory(types, matches, possibleMatches) {
  var isMandatory = false;

  if (types.includes('null') || types.includes('undefined')) {
    isMandatory = false;
  } else if (matches === possibleMatches) {
    isMandatory = true;
  }

  return isMandatory;
};

var getMandatoryFlag = function getMandatoryFlag(_ref) {
  var types = _ref.types,
      matches = _ref.matches,
      possibleMatches = _ref.possibleMatches,
      flagIfYes = _ref.flagIfYes,
      flagIfNo = _ref.flagIfNo;
  return isPropMandatory(types, matches, possibleMatches) ? flagIfYes : flagIfNo;
};

var findTypesObjects = function findTypesObjects(types) {
  return types.filter(function (type) {
    return (typeof type === 'undefined' ? 'undefined' : _typeof(type)) === 'object';
  });
};
var findTypesNoObjects = function findTypesNoObjects(types) {
  return types.filter(function (type) {
    return (typeof type === 'undefined' ? 'undefined' : _typeof(type)) !== 'object';
  });
};

var generateTypesWithMergedObjects = function generateTypesWithMergedObjects(types) {
  var typesObjects = findTypesObjects(types);
  var typesWithMergedObjects = types;

  if (typesObjects.length > 1) {
    var merged = Object.assign.apply(Object, [{}].concat(toConsumableArray(typesObjects)));

    var JSONFromTernary = getJSONFromTernary({ // eslint-disable-line
      objs: typesObjects,
      merged: merged
    });

    typesWithMergedObjects = [].concat(findTypesNoObjects(types), JSONFromTernary);
  }

  return typesWithMergedObjects;
};

var generateJSONValue = function generateJSONValue(types) {
  var JSONValue = '';

  var typesWithMergedObject = generateTypesWithMergedObjects(types);

  var typesWithoutNullAndUndef = typesWithMergedObject.filter(function (type) {
    return type !== 'undefined' && type !== 'null';
  });

  typesWithoutNullAndUndef.forEach(function (item, index) {
    if ((typeof item === 'undefined' ? 'undefined' : _typeof(item)) === 'object') {
      JSONValue += '' + JSON.stringify(item, null, 2);
    } else {
      JSONValue += '' + item;
    }

    if (index < typesWithoutNullAndUndef.length - 1) JSONValue += ' | ';
  });

  return JSONValue;
};

var parseStringifiedObject = function parseStringifiedObject(stringifiedObject) {
  var parsedObject = {};
  Object.keys(stringifiedObject).forEach(function (key) {
    var value = stringifiedObject[key];

    var type = typeof value === 'undefined' ? 'undefined' : _typeof(value);

    if (type === 'string') {
      try {
        var parsed = JSON.parse(value);
        if ((typeof parsed === 'undefined' ? 'undefined' : _typeof(parsed)) === 'object') {
          parsedObject[key] = parseStringifiedObject(parsed);
        } else {
          parsedObject[key] = value;
        }
      } catch (e) {
        parsedObject[key] = value;
      }
    } else {
      parsedObject[key] = value;
    }
  });

  if (parsedObject[0]) return [parsedObject[0]];

  return parsedObject;
};

function getJSONFromTernary(ternaryObject) {
  var merged = ternaryObject.merged,
      objs = ternaryObject.objs;

  var mergedKeys = Object.keys(merged);

  var stringifiedObject = {};

  mergedKeys.forEach(function (key) {
    var matches = 0;
    var types = [];

    objs.forEach(function (obj) {
      if (key in obj) {
        var value = obj[key];
        matches += 1;
        var type = typeof value === 'undefined' ? 'undefined' : _typeof(value);

        if (Array.isArray(value)) {
          type = parseArray(value);
        } else if (value === null) {
          type = 'null';
        } else if ((typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object') {
          type = parseObject(value);
        }

        if (!types.includes(type)) types.push(type);
      }
    });

    var mandatoryFlag = getMandatoryFlag({
      types: types,
      matches: matches,
      possibleMatches: objs.length,
      flagIfYes: '',
      flagIfNo: '?'
    });
    var JSONKey = '' + mandatoryFlag + key;
    var JSONValue = generateJSONValue(types);

    stringifiedObject[JSONKey] = JSONValue;
  });

  var JSONFromTernary = parseStringifiedObject(stringifiedObject);

  return JSONFromTernary;
}

var getParamsFromUrl = function getParamsFromUrl(url) {
  var paramsFromUrl = {};
  url.split('?')[0].split('/').filter(function (item) {
    return item.includes(':');
  }).forEach(function (param) {
    paramsFromUrl[param.replace(':', '')] = '';
  }); // all route params are strings

  return paramsFromUrl;
};

var getDataFromArray = function getDataFromArray(array) {
  var data = {};
  array.forEach(function (item) {
    data[item] = '';
  });
  return data;
};

var getArrayOfJSON = function getArrayOfJSON(json) {
  var string = JSON.stringify(json, null, 2).replace(/\\"/g, "'").replace(/\\n/g, '\n  ');

  var array = string.split('\n');

  return array;
};

var generateDocsFromArray = function generateDocsFromArray(array) {
  var docs = {
    language: 'js',
    content: []
  };

  getArrayOfJSON(array).forEach(function (item) {
    return docs.content.push(item);
  });

  return docs;
};

var generateDocsFromObject = function generateDocsFromObject(response, body) {
  var hostQuery = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
  var queryArray = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [];
  var url = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : '';

  var docs = {
    language: 'js',
    content: []
  };

  var json = void 0;

  if (Array.isArray(response)) {
    json = '[' + parseObject(response) + ']';
  } else if ((typeof response === 'undefined' ? 'undefined' : _typeof(response)) === 'object') {
    json = parseObject(response);
  } else {
    var responseJSON = response({
      body: body,
      params: getParamsFromUrl(url),
      query: getDataFromArray(queryArray),
      hostQuery: getDataFromArray(hostQuery)
    });

    if ('@m_docs' in responseJSON) {
      json = getJSONFromTernary(responseJSON['@m_docs']);
    } else {
      json = parseObject(responseJSON);
    }
  }

  getArrayOfJSON(json).forEach(function (item) {
    return docs.content.push(item);
  });

  return docs;
};

var getFileName = function getFileName(fileName) {
  return fileName.toLocaleLowerCase().replace(new RegExp(' ', 'g'), '-') + '.md';
};

var generateDocumentation = (function (route) {
  var docs = route.docs;

  var fileContent = [];

  fileContent.push({
    h1: docs.title
  });

  if (docs.description) {
    fileContent.push({
      blockquote: docs.description
    });
  }

  fileContent.push({
    h2: 'Method'
  });

  fileContent.push({
    p: route.method.toLocaleUpperCase()
  });

  fileContent.push({
    h2: 'URL'
  });

  fileContent.push({
    code: {
      language: 'js',
      content: [route.url.split('?')[0]] // ignore query params
    }
  });

  if (docs.hostQuery) {
    fileContent.push({
      h2: 'Host Query Parameters'
    });
    fileContent.push({
      blockquote: 'For mock development'
    });
    fileContent.push({
      code: generateDocsFromArray(docs.hostQuery)
    });
  }

  if (docs.query) {
    fileContent.push({
      h2: 'Query Parameters'
    });
    fileContent.push({
      code: generateDocsFromArray(docs.query)
    });
  }

  if (docs.body) {
    fileContent.push({
      h2: 'Body'
    });
    fileContent.push({
      code: generateDocsFromObject(docs.body)
    });
  }

  if (route.json) {
    fileContent.push({
      h2: 'Response'
    });
    fileContent.push({
      code: generateDocsFromObject(route.json)
    });
  } else if (route.controller) {
    fileContent.push({
      h2: 'Response'
    });
    fileContent.push({
      code: generateDocsFromObject(route.controller, docs.body, docs.hostQuery, docs.query, route.url) // eslint-disable-line
    });
  }

  var fileName = getFileName(docs.fileName || docs.title);

  return {
    fileName: fileName,
    fileContent: fileContent
  };
});

var bodyParser = require('body-parser');
var express = require('express');
var morgan = require('morgan');

var _require = require('react-dev-utils/WebpackDevServerUtils'),
    choosePort = _require.choosePort;

var json2md = require('json2md');
var fs = require('fs');
var path = require('path');
var colors = require('colors'); // eslint-disable-line no-unused-vars

var app = express();

app.use(bodyParser.json());
app.use(morgan('dev'));

var requestHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS, PATCH',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Content-Length, X-Requested-With, X-Redmine-API-Key, X-On-Behalf-Of'
};

/**
* @param {Object<[key: string]: string>} headers
* @returns void
*/
var setupHeaders = function setupHeaders(headers) {
  app.use(function (req, res, next) {
    if (req.method === 'OPTIONS') {
      var headersArray = Object.keys(headers);

      if (headersArray.length) {
        headersArray.forEach(function (headerID) {
          res.header(headerID, headers[headerID]);
        });
      }

      res.sendStatus(200);
    } else {
      next();
    }
  });
};

var writeFiles = function writeFiles(url, fileContent) {
  fs.writeFile(url, json2md(fileContent), function (err) {
    if (err) {
      console.log(err.red); // eslint-disable-line no-console
    } else {
      console.log('\uD83D\uDCC4 ' + url); // eslint-disable-line no-console
    }
  });
};

var clearDocsFolder = function clearDocsFolder(docsUrl) {
  try {
    var files = fs.readdirSync(docsUrl);
    Object.keys(files).forEach(function (key) {
      var file = files[key];
      fs.unlinkSync(path.join(docsUrl, file));
    });
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log(('Cannot find the path: ' + docsUrl).red); // eslint-disable-line no-console
    } else {
      console.log(err); // eslint-disable-line no-console
    }
  }
};

var createDocs = function createDocs(routes, docsUrl) {
  var docsFolderCleared = false;
  routes.forEach(function (route) {
    if (route.docs) {
      if (!docsFolderCleared) {
        clearDocsFolder(docsUrl);
        docsFolderCleared = true;
      }

      var documentation = generateDocumentation(route);
      var url = docsUrl + '/' + documentation.fileName;

      writeFiles(url, documentation.fileContent);
    }
  });
};

var start = function start(_ref) {
  var _ref$routes = _ref.routes,
      routes = _ref$routes === undefined ? [] : _ref$routes,
      _ref$defaultPort = _ref.defaultPort,
      defaultPort = _ref$defaultPort === undefined ? 3000 : _ref$defaultPort,
      _ref$docsUrl = _ref.docsUrl,
      docsUrl = _ref$docsUrl === undefined ? path.resolve(process.cwd(), 'docs') : _ref$docsUrl,
      _ref$headers = _ref.headers,
      headers = _ref$headers === undefined ? requestHeaders : _ref$headers;

  setupHeaders(headers);

  app.use('/', createRouter(routes));
  choosePort('0.0.0.0', defaultPort).then(function (port) {
    if (port == null) return;
    app.listen(port, function () {
      return console.log(('\uD83D\uDE80 App started on port: ' + port).green);
    }); // eslint-disable-line no-console
  });

  createDocs(routes, docsUrl);
};

module.exports = {
  requestHeaders: requestHeaders,
  start: start,
  ternary: ternary
};
//# sourceMappingURL=index.js.map
