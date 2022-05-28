const testData1 = {
  isError: false,
  data: [
    {
      id: 0,
      isError: false,
      data: [
        1,2,3
      ]
    },
    {
      id: 2,
      isError: false,
      data: [
        4,5,6
      ]
    }
  ]
}

// {
//   num: count(flatten(input.data[any].data[any])),
//   datas: flatten(input.data[any].data[any])
// }

const testData2 = {
  '00:00':'10',
  '00:05':'20',
  '00:10':'30',
  '00:15':'40'
}

// {
//   time: input.toArray()[any].key,
//   value: input.toArray()[any].value
// }


// input.toArray().map(item => ({
//   time: item.key,
//   value: item.value
// }))


// makeArray(input.toArray(), item => ({item.key, item.value}));
const any = Symbol('any');
const anyFun = () => true;
const map = Symbol('map');
const where = Symbol('where');
const inner = Symbol('inner');
const asArray = Symbol('asArray');
const cvtType = Symbol('cvtType');

function flatten(arr){
  const c = arr[inner];
  c.after = c.after || [];
  c.after.push(item => item.flat());
  return arr;
}

function count(arr){
  const c = arr[inner];
  c.after = c.after || [];
  c.after.push(item => item.length);
  return arr;
}

class ValueDescriber{
  constructor(path){
    this.path = path;
  }
}

function ValueCollector(path = []){
  const obj = new Proxy(new ValueDescriber(path), {
    get(target, property, receiver){
      if(typeof property === 'string'){
        return ValueCollector([...path, property])
      } else {
        switch(property){
          case any: return ValueCollector([...path, {type: 'filter',filter: anyFun}]);
          case map: return function(lambda){ return ValueCollector([...path, {type: 'map', lambda}]); };
          case cvtType: return function(lambda){ return ValueCollector([...path, {type: 'cvtType', lambda}]); };
          case asArray: return ValueCollector([...path, asArray]);
          case where: return function(filter){ return ValueCollector([...path, {type: 'filter', filter}]); };
          case inner: return target;
          default: throw new Error('未知的运算符');
        }
      }
    }
  })
  return obj;
}

function mapValueDescriber(obj, map){
  if(obj instanceof ValueDescriber){
    return map(obj[inner]);
  }
  for(const key in obj){
    if(obj[key] instanceof ValueDescriber){
      obj[key] = map(obj[key][inner]);
      continue;
    }
    if(obj[key] instanceof Object){
      extractValueDescriber(obj[key], map);
      continue;
    }
    if(Array.isArray(obj[key])){
      obj[key].forEach(item => extractValueDescriber(item, map));
    }
  }
  return obj;
}

function getDataThroughtPath(data, path, i = 0){
  for(i; i < path.length; i++){
    const key = path[i];
    if(typeof key === 'string'){
      data = data[key];
    } else if(key instanceof Object){
      switch(key.type){
        case 'map':{
          data = data.map(key.lambda);
          break;
        }
        case 'cvtType':{
          data = key.lambda(data);
          break;
        }
        case 'filter':
          return data.filter(key.filter).map(item => getDataThroughtPath(item, path, i + 1));
        default: throw new Error('未知的运算符')
      }
    } else if(typeof key === 'symbol'){
      switch(key){
        case asArray:{
          data = Object.entries(data);
          break;
        }
        default: throw new Error('未知的运算符')
      }
    }
  }
  return data;
}

function processData(data, methods = []){
  for(const method of methods){
    data = method(data);
  }
  return data;
}

function getValue(data, describer){
  const path = describer.path;
  return processData(getDataThroughtPath(data, path), describer.after);
}

function easyFilter(data, filter) {
  const c = ValueCollector();
  let result = filter(c);
  // const describers = [];

  result = mapValueDescriber(result, item => getValue(data, item));

  return result;
  // const describerToValue = new Map();
  // for(const d of describers){
  //   describerToValue.set(d, getValue(data, d));
  // }

  // extractValueDescriber(result, item => {
  //   return describerToValue.get(item);
  // });
}

console.log(easyFilter(testData1, input => ({
  num: count(flatten(input.data[where]((_, index) => index % 2).data[any])),
  datas: flatten(input.data[any].data[any])
})))

console.log(easyFilter(testData2, input => (
  {
    time: input[asArray][any][0],
    value: input[asArray][any][1][cvtType](item => +item),
    f: flatten(input[asArray][any])
  }
)))

console.log(easyFilter(testData2, input => (
  input[asArray][map](item => ({
    key: item[0],
    value: item[1]
  }))[any].value
)))

console.log(easyFilter(testData2, input => (
  input[asArray][any][cvtType](item => ({
    key: item[0],
    value: item[1]
  })).value
)))