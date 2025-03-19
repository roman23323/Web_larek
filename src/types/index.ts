import './scss/styles.scss';

//--------- Типы для товаров ---------//

interface IItemModel {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  description: string;
}

abstract class BaseItem {
  id: string; 
  name: string;
  price: number;

  constructor(data: IItemModel) {
    this.id = data.id;
    this.name = data.name;
    this.price = data.price;
  }
}

class BasketItem extends BaseItem{
  constructor(data: IItemModel) {
    super(data);
  }
}

class CatalogItem extends BaseItem {
  category: string;
  image: string;
  description: string;

  constructor(data: IItemModel) {
    super(data);
    this.category = data.category;
    this.image = data.image;
    this.description = data.description;
  }
}

//---- Типы для каталога и корзины ----//

// -> Общие типы, которые можно переиспользовать

interface IList<T> {
  total: number,
  items: T[]
}

interface IListAPI<D> {
  loadItemsList(): Promise<IList<D>>
}

interface IItemConstructor<T, D> {
  new (itemData: D): T
}

abstract class List<T> implements IList<T> {
  total: number;
  protected _items: T[];
  
  get items(): T[] {
    return this._items;
  }
}

abstract class LoadList<T, D> extends List<T> {
  constructor(
    protected _ItemConstructor: IItemConstructor<T, D>,
    protected _api: IListAPI<D>
  ) {
    super();
  }
  abstract load(): Promise<void>;
}

abstract class ModifiableList<T> extends List<T> {
  abstract addItem(item: T): void
  abstract delete(itemIndex: number): void
}

// -> Конкретные типы для каталога и корзины

type OrderPostResponse = {id: string, total: number};
type ErrorResponse = {error: string};
type PaymentType = 'offline' | 'online';

interface IOrderInfo {
  payment: PaymentType;
  email: string;
  phone: string;
  address?: string;
  total: number;
  items: string[];
}

interface IItemAPI extends IListAPI<IItemModel> {
  loadProduct(id: string): Promise<IItemModel | ErrorResponse>
  postOrder(orderInfo: IOrderInfo): Promise<OrderPostResponse | ErrorResponse>
}

class CatalogList extends LoadList<CatalogItem, IItemModel> {
  constructor(api: IItemAPI) {
    super(CatalogItem, api);
  }

  itemClick(itemIndex: number): void {
    // Открытие поп-апа с товаром
    console.log(`Открытие карточки с товаром ${itemIndex}`);
  }

  async load(): Promise<void> {
    const data = await this._api.loadItemsList();
    this.total = data.total;
    this._items = data.items.map(itemData => new this._ItemConstructor(itemData));
  }
}

class BasketList extends ModifiableList<BasketItem> {
  addItem(item: BasketItem): void {
    this._items.push(item)
  }

  delete(itemIndex: number): void {
    this._items.splice(itemIndex, 1);
  }
}

// -> Фейковое API для теста

class FakeItemsAPI implements IItemAPI {
  private total = 10;
  private data: IItemModel[] = [
    {id: '0', name: 'Товар 0', price: 0, category: 'Категория 0', image: 'Image 0.jpg', description: 'Описание 0'},
    {id: '1', name: 'Товар 1', price: 1, category: 'Категория 1', image: 'Image 1.jpg', description: 'Описание 1'},
    {id: '2', name: 'Товар 2', price: 2, category: 'Категория 2', image: 'Image 2.jpg', description: 'Описание 2'},
    {id: '3', name: 'Товар 3', price: 3, category: 'Категория 3', image: 'Image 3.jpg', description: 'Описание 3'},
    {id: '4', name: 'Товар 4', price: 4, category: 'Категория 4', image: 'Image 4.jpg', description: 'Описание 4'},
    {id: '5', name: 'Товар 5', price: 5, category: 'Категория 5', image: 'Image 5.jpg', description: 'Описание 5'},
    {id: '6', name: 'Товар 6', price: 6, category: 'Категория 6', image: 'Image 6.jpg', description: 'Описание 6'},
    {id: '7', name: 'Товар 7', price: 7, category: 'Категория 7', image: 'Image 7.jpg', description: 'Описание 7'},
    {id: '8', name: 'Товар 8', price: 8, category: 'Категория 8', image: 'Image 8.jpg', description: 'Описание 8'},
    {id: '9', name: 'Товар 9', price: 9, category: 'Категория 9', image: 'Image 9.jpg', description: 'Описание 9'}
  ];

  loadItemsList(): Promise<IList<IItemModel>> {
    return Promise.resolve<IList<IItemModel>>({
      total: this.total,
      items: this.data
    });
  }

  loadProduct(id: string): Promise<IItemModel | ErrorResponse> {
    const item = this.data.find(item => item.id === id);
    return Promise.resolve(item || {error: 'NotFound'});
  }

  // Отправка заказа с возратом ошибок, указанных в Postman-коллекции
  postOrder(orderInfo: IOrderInfo): Promise<OrderPostResponse | ErrorResponse> {
    // Проверка наличия адреса
    if (!orderInfo.address) {
      return Promise.resolve({ error: 'Не указан адрес' });
    }

    // Проверка наличия всех товаров в списке data
    for (const orderedItemId of orderInfo.items) {
      const itemExists = this.data.some(item => item.id === orderedItemId);
      if (!itemExists) {
        return Promise.resolve({ error: `Товар с id ${orderedItemId} не найден` });
      }
    }

    // Проверка корректности общей суммы заказа
    const calculatedTotal = orderInfo.items.reduce((sum, itemId) => {
      const item = this.data.find(item => item.id === itemId);
      return sum + (item?.price || 0);
    }, 0);

    if (calculatedTotal !== orderInfo.total) {
      return Promise.resolve({ error: 'Неверная сумма заказа' });
    }

    // Если все проверки пройдены, возвращаем успешный ответ
    return Promise.resolve({
      id: 'test-order-id',
      total: orderInfo.total
    });
  }
}

// Типы для поп-апов

type FieldType = 'editText' | 'radioButton';

interface IField {
  fieldType: FieldType;
  fieldName: string;
  isValid(): boolean;
}

interface IRadioButtonField extends IField {
  fieldType: 'radioButton'
  choices: string[];
  selected?: string;
}

interface IEditTextField extends IField {
  fieldType: 'editText';
  value: string;
  hint: string;
}

// Фабричные методы для создания полей поп-апов ввода данных
const createEditTextField = (fieldName: string, hint: string): IEditTextField => ({
  fieldType: 'editText',
  fieldName,
  hint,
  value: '',
  isValid() {
    return this.value.trim().length > 0;
  }
});

const createRadioButtonField = (fieldName: string, choices: string[]): IRadioButtonField => ({
  fieldType: 'radioButton',
  fieldName,
  choices,
  selected: '',
  isValid() {
    return this.selected !== '';
  }
});

interface IPopup {
  bottomButtonText: string,
  // Нужны вообще?
  closePopup(): void;
  openPopup(): void;
}

class OrderPopup implements IPopup {
  constructor(
    public bottomButtonText: string,
    public fields: IField[]
  ) {}

  isValid(): boolean {
    return this.fields.every(field => field.isValid());
  }

  getFormData(): Record<string, string> {
    return this.isValid && this.fields.reduce((fieldsData, field) => {
      if (field.fieldType === 'editText') {
        fieldsData[field.fieldName] = (field as IEditTextField).value;
      } else if (field.fieldType === 'radioButton') {
        // Здесь нет проверки на то, что у поля оплаты выбрали
        // вариант, т.к. данные формы будут получаться
        // только после валидации
        fieldsData[field.fieldName] = (field as IRadioButtonField).selected;
      }
      return fieldsData;
    }, {} as Record<string, string>);
  }

  closePopup(): void {
    console.log('Закрытие поп-апа с оплатой');
  }
  
  openPopup(): void {
    console.log('Открытие поп-апа с оплатой');
  }
}

class ItemPopup implements IPopup{
  constructor(
    public bottomButtonText: string,
    public item: IItemModel
  ) {}

  closePopup(): void {
    console.log('Закрытие поп-апа с товаром');
  }
  openPopup(): void {
    console.log('Открытие поп-апа с товаром');
  }
}

class BasketPopup implements IPopup{
  public title: string = "Корзина";
  public bottomButtonText: string = "Оформить";

  constructor(
    public list: ModifiableList<BasketItem>
  ) {}

  getTotal(): number {
    return this.list.items.reduce((total, item) => total + item.price, 0);
  }
  closePopup(): void {
    console.log('Закрытие поп-апа с корзиной');
  }
  openPopup(): void {
    console.log('Открытие поп-апа с корзиной');
  }
}

class SuccessPopup implements IPopup{
  bottomButtonText: string = "За новыми покупками!";

  constructor(
    public image: string,
    public total: number
  ) {}
  
  closePopup(): void {
    console.log('Закрытие поп-апа с подтверждением покупки');
  }
  openPopup(): void {
    console.log('Открытие поп-апа с подтверждением покупки');
  }
}



const orderPopup1 = new OrderPopup("Далее",
  [
    createRadioButtonField(
      "Способ оплаты", ["Онлайн", "При получении"]
    ),
    createEditTextField(
      "Адрес доставки",
      "Введите адрес"
    ),
  ]
);
const orderPopup2 = new OrderPopup("Оплатить",
  [
    createEditTextField(
      "Email", "Введите Email"
    ),
    createEditTextField(
      "Телефон", "+7 (9"
    )
  ]
);

const api = new FakeItemsAPI
const catalogLoadList = new CatalogList(api);
catalogLoadList
  .load()
  .then(() => {
    catalogLoadList.itemClick(2);
  })